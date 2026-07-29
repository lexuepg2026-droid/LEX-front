import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// TIMBRADO — APROXIMAÇÃO VISUAL, NÃO A FONTE DA VERDADE
//
// A fonte da verdade do timbrado é `documentRenderService.js`, no backend, que
// esta fase NÃO altera. É ele que decide o que sai no PDF e no DOCX.
//
// Este componente existe só para a advogada reconhecer o documento dela
// enquanto monta: ver o cabeçalho no lugar, a proporção da folha, onde o corpo
// começa. O arquivo baixado pode diferir em milímetros de espaçamento e em
// renderização de fonte — e isso é aceitável, porque a decisão de layout não
// mora aqui.
//
// O que é reproduzido de propósito, porque muda a leitura da tela:
//   - as quatro linhas do timbrado, na mesma ordem e composição de
//     `montarTimbrado()`: nome da advocacia, identificação (nome — OAB/UF nº),
//     endereço em linha, contato (telefone · e-mail)
//   - o descarte de linha vazia. Sem logo, ou sem telefone, o cabeçalho usa só
//     o que existe e continua bem diagramado — a coluna da imagem não é
//     reservada, senão abriria um buraco na diagramação de quem não subiu logo.
//     Mesma regra da Fase 2C.
//
// O que NÃO é reproduzido: cálculo de altura em pontos, registro de fontes,
// numeração "página X de Y" real (a tela não pagina). Duplicar isso aqui seria
// criar uma segunda fonte da verdade para o layout.
// ═══════════════════════════════════════════════════════════════════════════

const textoOuVazio = (v) => (v === undefined || v === null ? '' : String(v).trim());

// Mesma composição de `formatarEnderecoLinha` do backend, inclusive o
// separador " · ", para o endereço quebrar nos mesmos pontos.
const enderecoEmLinha = (endereco) => {
  if (!endereco || typeof endereco !== 'object') return '';

  const logradouro = textoOuVazio(endereco.logradouro);
  const numero = textoOuVazio(endereco.numero);
  const complemento = textoOuVazio(endereco.complemento);
  const bairro = textoOuVazio(endereco.bairro);
  const cidade = textoOuVazio(endereco.cidade);
  const estado = textoOuVazio(endereco.estado);
  const cep = textoOuVazio(endereco.cep);

  const partes = [];
  if (logradouro) partes.push(numero ? `${logradouro}, ${numero}` : logradouro);
  else if (numero) partes.push(`nº ${numero}`);
  if (complemento) partes.push(complemento);
  if (bairro) partes.push(bairro);
  if (cidade && estado) partes.push(`${cidade}/${estado}`);
  else if (cidade) partes.push(cidade);
  if (cep) partes.push(`CEP ${cep}`);

  return partes.join(' · ');
};

// Não exportada: só este componente monta timbrado, e exportá-la convidaria
// outra tela a reproduzir o cabeçalho por conta própria — que é justamente o
// caminho para a segunda fonte da verdade que este arquivo evita.
const montarTimbrado = (usuario) => {
  const advocacia = usuario?.advocacia ?? {};
  const oab = usuario?.oab ?? {};

  const identificacao = [
    textoOuVazio(usuario?.nomeCompleto),
    oab.numero && oab.estado ? `OAB/${oab.estado} nº ${oab.numero}` : '',
  ]
    .filter(Boolean)
    .join(' — ');

  const contato = [textoOuVazio(usuario?.telefone), textoOuVazio(usuario?.email)]
    .filter(Boolean)
    .join(' · ');

  return {
    logoBase64: textoOuVazio(advocacia.logoBase64) || null,
    nomeAdvocacia: textoOuVazio(advocacia.nome),
    identificacao,
    endereco: enderecoEmLinha(usuario?.endereco),
    contato,
  };
};

function Letterhead({ usuario }) {
  const timbrado = montarTimbrado(usuario);

  const linhas = [timbrado.identificacao, timbrado.endereco, timbrado.contato].filter(Boolean);

  // Timbrado inteiro vazio (perfil recém-criado) não vira faixa em branco: sai
  // um aviso discreto, que também diz onde resolver.
  if (!timbrado.nomeAdvocacia && linhas.length === 0 && !timbrado.logoBase64) {
    return (
      <header className="canvas-timbrado canvas-timbrado--vazio">
        <p>
          Sem timbrado. Preencha o escritório, a OAB e o endereço no{' '}
          <strong>Perfil</strong> para o cabeçalho aparecer aqui e no arquivo baixado.
        </p>
      </header>
    );
  }

  return (
    <header className="canvas-timbrado">
      {timbrado.logoBase64 && (
        <img
          src={timbrado.logoBase64}
          alt=""
          aria-hidden="true"
          className="canvas-timbrado__logo"
        />
      )}
      <div className="canvas-timbrado__texto">
        {timbrado.nomeAdvocacia && (
          <p className="canvas-timbrado__titulo">{timbrado.nomeAdvocacia}</p>
        )}
        {linhas.map((linha) => (
          <p key={linha} className="canvas-timbrado__linha">
            {linha}
          </p>
        ))}
      </div>
    </header>
  );
}

export default Letterhead;
