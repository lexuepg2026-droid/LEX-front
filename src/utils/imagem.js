// ═══════════════════════════════════════════════════════════════════════════
// PREPARO DO LOGO DO ESCRITÓRIO
//
// O backend aceita PNG/JPEG em data URI, com teto de 200 KB sobre a string
// base64 — o User é lido em toda requisição autenticada, então logo grande
// pesa no sistema inteiro.
//
// A advogada não deve precisar abrir editor de imagem para respeitar isso.
// Foto de celular tem 3–8 MB; recusar seria transferir para ela um problema
// que o navegador resolve sozinho. Por isso: imagem acima do limite é
// REDIMENSIONADA via canvas, não recusada.
// ═══════════════════════════════════════════════════════════════════════════

export const LOGO_MIMES_ACEITOS = ["image/png", "image/jpeg"];
export const LOGO_LIMITE_BYTES = 200 * 1024;

// Folga de 5%: o limite do backend é rígido, e recomprimir para exatamente
// 200 KB deixaria qualquer arredondamento de codificação estourar.
const ALVO_BYTES = Math.floor(LOGO_LIMITE_BYTES * 0.95);

// Um logo de timbrado é impresso com ~64 pt de largura. 512 px já é o dobro do
// necessário para impressão nítida; acima disso são bytes que ninguém enxerga.
const LADO_MAXIMO_INICIAL = 512;

export const formatarTamanho = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

// Tamanho real da string que vai para o backend — é ela que o limite mede.
export const tamanhoDoDataUri = (dataUri) =>
  new Blob([dataUri ?? ""]).size;

export const lerArquivoComoDataUri = (arquivo) =>
  new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    leitor.readAsDataURL(arquivo);
  });

const carregarImagem = (dataUri) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Arquivo não é uma imagem válida."));
    img.src = dataUri;
  });

const desenhar = (img, lado, mime, qualidade) => {
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * escala));
  canvas.height = Math.max(1, Math.round(img.height * escala));

  const ctx = canvas.getContext("2d");

  // PNG com transparência vira preto ao virar JPEG. Fundo branco antes de
  // desenhar evita o logo transparente sair com tarja preta no timbrado.
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(mime, qualidade);
};

/**
 * Recebe o File do input e devolve { dataUri, redimensionada, tamanhoOriginal,
 * tamanhoFinal } pronto para o PATCH.
 *
 * Lança Error com mensagem legível quando o tipo não é aceito ou quando nem a
 * compressão máxima cabe no limite.
 */
export const prepararLogo = async (arquivo) => {
  if (!arquivo) throw new Error("Nenhum arquivo selecionado.");

  if (!LOGO_MIMES_ACEITOS.includes(arquivo.type)) {
    throw new Error(
      `Formato não aceito: ${arquivo.type || "desconhecido"}. Envie um PNG ou JPEG.`
    );
  }

  const original = await lerArquivoComoDataUri(arquivo);
  const tamanhoOriginal = tamanhoDoDataUri(original);

  if (tamanhoOriginal <= LOGO_LIMITE_BYTES) {
    return {
      dataUri: original,
      redimensionada: false,
      tamanhoOriginal,
      tamanhoFinal: tamanhoOriginal
    };
  }

  const img = await carregarImagem(original);

  // PNG grande quase sempre é foto salva no formato errado: recomprimir como
  // PNG não adianta (é sem perdas). Transcodificar para JPEG é o que de fato
  // reduz — e um logo de timbrado não perde nada visível com isso.
  const mimeSaida = "image/jpeg";

  // Reduz lado e qualidade em passos, parando no primeiro que couber. Começa
  // pelo mais conservador para não degradar mais que o necessário.
  const tentativas = [
    [LADO_MAXIMO_INICIAL, 0.92],
    [LADO_MAXIMO_INICIAL, 0.85],
    [384, 0.85],
    [320, 0.8],
    [256, 0.8],
    [192, 0.75],
    [128, 0.7]
  ];

  for (const [lado, qualidade] of tentativas) {
    const candidato = desenhar(img, lado, mimeSaida, qualidade);
    const tamanho = tamanhoDoDataUri(candidato);

    if (tamanho <= ALVO_BYTES) {
      return {
        dataUri: candidato,
        redimensionada: true,
        tamanhoOriginal,
        tamanhoFinal: tamanho
      };
    }
  }

  // Só chega aqui com imagem patológica (ruído em resolução altíssima). Falhar
  // com mensagem clara é melhor do que enviar e receber 400 do backend.
  throw new Error(
    `Não foi possível reduzir a imagem para menos de ${formatarTamanho(LOGO_LIMITE_BYTES)}. Tente um arquivo menor ou mais simples.`
  );
};

export default { prepararLogo, tamanhoDoDataUri, formatarTamanho, LOGO_LIMITE_BYTES };
