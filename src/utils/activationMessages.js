// ═══════════════════════════════════════════════════════════════════════════
// AS FRASES DE DESATIVAR E REATIVAR — DEC-052
//
// ── Por que são função pura, e não texto solto na tela ──────────────────
// As duas listagens (Clientes e Processos) fazem a mesma pergunta e precisam
// dar a mesma resposta. Texto escrito duas vezes diverge na primeira revisão de
// redação — e aqui divergir significa uma tela prometer que os processos voltam
// e a outra dizer que não.
//
// ── O que estas frases carregam, e por que importa ──────────────────────
// **A contagem antes da ação.** A advogada precisa saber o tamanho do efeito
// ANTES de causá-lo — é a mesma regra do modal de estorno (passo 161), e o
// motivo é o mesmo: uma confirmação que não diz o que vai acontecer não é
// confirmação, é um "tem certeza?" que ninguém lê.
//
// **A ausência de cascata, dita em voz alta.** Reativar um cliente NÃO reativa
// os processos dele. Sem a frase, a advogada reativa o cliente, presume que
// voltou tudo, e só descobre o contrário quando for procurar um processo.
//
// **Que os removidos à mão não voltam.** É a DEC-052 aparecendo na tela: a
// reativação restaura só o que a cascata derrubou. Sem dizer isso, o número
// "voltam 2" parece errado para quem lembra que havia 3.
// ═══════════════════════════════════════════════════════════════════════════

// "1 participante" / "2 participantes" — sem o `1 participante(s)` que denuncia
// que ninguém olhou a frase.
const plural = (n, singular, pluralForma) =>
  `${n} ${n === 1 ? singular : pluralForma}`;

// ── Processo ──────────────────────────────────────────────────────────────

export const mensagemDesativarProcesso = (vinculos = 0) => {
  // "não pode ser desfeita" SAIU: a reativação existe desde a DEC-052, e a
  // frase antiga passou a ser mentira. Prometer irreversibilidade numa ação
  // reversível faz a advogada evitar uma operação segura.
  const base = 'Este processo será desativado e deixa de aparecer nas listagens.';

  // Sem participantes, a promessa de que "eles voltam" não tem sujeito — e uma
  // frase sobre gente que não existe faz a advogada procurar quem seria.
  if (vinculos === 0) {
    return `${base} Ele não tem participantes ativos. Nada é apagado — você pode reativá-lo depois.`;
  }

  const quantos = plural(vinculos, 'participante vinculado sai', 'participantes vinculados saem');
  return (
    `${base} ${quantos} junto. Nada é apagado — você pode reativá-lo depois,` +
    ` e ${vinculos === 1 ? 'esse participante volta' : 'esses participantes voltam'} com ele.`
  );
};

export const mensagemReativarProcesso = (vinculos = 0) => {
  const efeito =
    vinculos > 0
      ? ` ${plural(vinculos, 'participante volta', 'participantes voltam')} com ele.`
      : ' Nenhum participante volta com ele.';

  return (
    `Este processo será reativado.${efeito}` +
    ' Participantes que você removeu à mão antes da desativação NÃO voltam.'
  );
};

// ── Cliente ───────────────────────────────────────────────────────────────

export const mensagemDesativarCliente = () =>
  'Este cliente será desativado e deixa de aparecer nas listagens.' +
  ' Nada é apagado — você pode reativá-lo depois.';

// A frase mais importante das quatro. A ausência de cascata precisa ser dita
// ANTES da confirmação, não descoberta depois.
export const mensagemReativarCliente = () =>
  'Este cliente será reativado.' +
  ' Os processos dele NÃO voltam — cada processo se reativa por si.';

export default {
  mensagemDesativarProcesso,
  mensagemReativarProcesso,
  mensagemDesativarCliente,
  mensagemReativarCliente
};
