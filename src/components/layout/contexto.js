import { nomeDoCliente } from '../../utils/enums.js';

// ═══════════════════════════════════════════════════════════════════════════
// O CABEÇALHO DE CONTEXTO — as regras, em função pura (Fase 2b, DEC-085)
//
// A trilha ("LEX › Honorários › Detalhe") saiu. No lugar dela, nas telas de
// detalhe e de formulário, uma faixa com "← Voltar" e o contexto do registro:
// "Cliente: Fulano (+2) · Processo: 0001234-56… — Título". É o apontamento da
// banca — toda tela diz a qual cliente e processo se refere — e o desenho da
// Raniele (Figura 21).
//
// Arquivo `.js`, e não `.jsx`: a suíte é `node --test` sem DOM, e "para onde o
// Voltar leva" precisa ser executado, não só lido.
// ═══════════════════════════════════════════════════════════════════════════

const D = '/dashboard';

// ── O pai de cada rota ────────────────────────────────────────────────────
// O mapa é o da trilha que saiu (`buildBreadcrumb`): toda tela dentro de uma
// seção volta à lista da seção. Com UM refinamento, e só onde existe a tela:
// o formulário de EDIÇÃO volta ao DETALHE do mesmo registro (cliente,
// processo, honorário), porque é de lá que se chega a ele, e voltar à lista
// faria a advogada procurar de novo o registro que acabou de editar.
//
// `null` = a tela não tem faixa: o Início, as listas, o Financeiro, o Perfil e
// as Pendências. Nelas a trilha só repetia o link ativo do cabeçalho.
const PADROES = [
  [/^\/dashboard\/clientes\/editar\/([^/]+)$/, (id) => `${D}/clientes/detalhe/${id}`],
  [/^\/dashboard\/clientes\/(novo|detalhe\/[^/]+)$/, () => `${D}/clientes`],

  [/^\/dashboard\/processos\/editar\/([^/]+)$/, (id) => `${D}/processos/detalhe/${id}`],
  [/^\/dashboard\/processos\/(novo|detalhe\/[^/]+)$/, () => `${D}/processos`],

  [/^\/dashboard\/honorarios\/editar\/([^/]+)$/, (id) => `${D}/honorarios/${id}`],
  [/^\/dashboard\/honorarios\/([^/]+)\/reparcelar$/, (id) => `${D}/honorarios/${id}`],
  [/^\/dashboard\/honorarios\/[^/]+$/, () => `${D}/honorarios`],

  [/^\/dashboard\/parcelas\/(novo|editar\/[^/]+)$/, () => `${D}/parcelas`],
  [/^\/dashboard\/pagamentos\/(novo|editar\/[^/]+)$/, () => `${D}/pagamentos`],

  [/^\/dashboard\/documentos\/(montar|montar\/[^/]+|[^/]+\/texto)$/, () => `${D}/documentos`],
  [/^\/dashboard\/secoes\/(nova|editar\/[^/]+)$/, () => `${D}/secoes`],
  [/^\/dashboard\/agenda\/(novo|editar\/[^/]+)$/, () => `${D}/agenda`],
];

// As quatro listas que filtram por `?processoId=` (DEC-070). Filtradas, elas
// GANHAM a faixa, e o pai é o processo — é de lá que as abas levam a elas.
const LISTAS_POR_PROCESSO = new Set([
  `${D}/honorarios`, `${D}/parcelas`, `${D}/pagamentos`, `${D}/documentos`,
]);

const semBarraFinal = (p) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);

export function paiDaRota(pathname, search = '') {
  const caminho = semBarraFinal(pathname || '');
  for (const [padrao, destino] of PADROES) {
    const m = caminho.match(padrao);
    if (m) return destino(m[1]);
  }
  if (LISTAS_POR_PROCESSO.has(caminho)) {
    const processoId = new URLSearchParams(search).get('processoId');
    if (processoId) return `${D}/processos/detalhe/${encodeURIComponent(processoId)}`;
  }
  // Fase 3.5 (DEC-124): a lista de processos filtrada por `?clienteId=` ganha a
  // faixa, e o pai é a aba "Processos" do cliente — é de lá que o link leva.
  if (caminho === `${D}/processos`) {
    const clienteId = new URLSearchParams(search).get('clienteId');
    if (clienteId) return `${D}/clientes/detalhe/${encodeURIComponent(clienteId)}?aba=processos`;
  }
  return null;
}

// ── `?voltar=`, validado ──────────────────────────────────────────────────
// Os botões de lançamento da ficha financeira (item 5) abrem o formulário com
// `?voltar=/dashboard/processos/detalhe/:id`, para o Salvar e o Voltar levarem
// de volta ao processo. Valor vindo da URL é entrada de qualquer um: só se
// aceita caminho INTERNO da área da advogada — nada de esquema, de `//host`,
// de barra invertida (que o navegador lê como `/`) nem de caractere de
// controle. Fora disso, o valor é ignorado, como se não existisse.
export function voltarValido(valor) {
  if (typeof valor !== 'string' || valor.length > 512) return null;
  if (!valor.startsWith(`${D}/`) && valor !== D) return null;
  if (/[\\\s]|%2f|%5c|\/\/|\.\./i.test(valor)) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f]/.test(valor)) return null;
  return valor;
}

export const lerVoltar = (search) => voltarValido(new URLSearchParams(search || '').get('voltar'));

// ── O destino final do "Voltar" ───────────────────────────────────────────
// 1. Um `?voltar=` válido manda — veio do próprio link de origem.
// 2. Senão, o pai do mapa, com a QUERY que ele tinha da última vez que foi
//    visitado nesta sessão: quem abriu a parcela a partir de
//    `/parcelas?processoId=X` volta para a lista filtrada, e não para a lista
//    inteira. `ultimaQuery` é um mapa caminho → search, mantido pela faixa a
//    cada navegação; visitar o pai pelo menu (sem query) sobrescreve, então a
//    query só sobrevive enquanto for a última vista daquele caminho.
export function destinoDoVoltar({ pathname, search = '' }, ultimaQuery = new Map()) {
  const explicito = lerVoltar(search);
  if (explicito) return explicito;
  const pai = paiDaRota(pathname, search);
  if (!pai) return null;
  if (pai.includes('?')) return pai;
  const query = ultimaQuery.get(pai);
  return query ? `${pai}${query}` : pai;
}

// ── O texto do contexto ───────────────────────────────────────────────────
// Do `GET /processes/:id` (título, número, `clientePrincipalId` populado e
// `participantes`) e do `GET /clients/:id`. Nada aqui busca: a faixa entrega
// o que o espelho resolveu.
const idDe = (v) => (v && typeof v === 'object' ? String(v._id ?? '') : String(v ?? ''));

export function contextoDoProcesso(processo) {
  if (!processo || typeof processo !== 'object') return null;
  const participantes = Array.isArray(processo.participantes) ? processo.participantes : [];
  const principal = participantes.find((p) => p.principal)?.clienteId ?? processo.clientePrincipalId;
  const idPrincipal = idDe(principal);
  const outros = participantes.filter((p) => idDe(p.clienteId) !== idPrincipal).length;
  const numero = (processo.numeroProcesso || '').trim();
  const titulo = (processo.titulo || '').trim();

  return {
    cliente: principal && typeof principal === 'object'
      ? { id: idPrincipal, nome: nomeDoCliente(principal), outros }
      : null,
    processo: {
      id: idDe(processo),
      rotulo: numero && titulo ? `${numero} — ${titulo}` : (numero || titulo || 'Processo'),
    },
  };
}

export function contextoDoCliente(cliente) {
  if (!cliente || typeof cliente !== 'object') return null;
  return { cliente: { id: idDe(cliente), nome: nomeDoCliente(cliente), outros: 0 }, processo: null };
}

// A frase inteira, para o `title` (o celular corta com reticências) e para o
// leitor de tela.
export function textoDoContexto(ctx) {
  if (!ctx) return '';
  const partes = [];
  if (ctx.cliente) {
    partes.push(`Cliente: ${ctx.cliente.nome}${ctx.cliente.outros > 0 ? ` (+${ctx.cliente.outros})` : ''}`);
  }
  if (ctx.processo) partes.push(`Processo: ${ctx.processo.rotulo}`);
  return partes.join(' · ');
}

// O `processoId` que vem populado (`{ _id, titulo, … }`) ou cru. Os
// honorários de `GET /fees` e `GET /fees/:id` trazem o objeto; o formulário
// guarda a string.
export const idDoProcesso = (valor) => {
  const id = idDe(valor);
  return id && id !== 'undefined' && id !== 'null' ? id : null;
};

// ── O casamento com o caminho ─────────────────────────────────────────────
// O que a página publicou só vale para o caminho em que ela publicou. É a
// regra do `BreadcrumbContext` que saiu, trazida para cá para ser executada
// pela suíte: entre navegar e a página nova publicar, a faixa não pode
// mostrar o processo da tela de onde a advogada veio.
const VAZIO = Object.freeze({ processoId: null, clienteId: null });

export function idsPublicadosPara(publicado, pathname) {
  if (!publicado || publicado.pathname !== pathname) return VAZIO;
  return { processoId: publicado.processoId ?? null, clienteId: publicado.clienteId ?? null };
}

// ── Um aviso de idade por tela (Fase 3.3b, DEC-109) ───────────────────────
// A tela que já mostra o próprio `OfflineNotice` publica `avisoProprio`, e a
// faixa deixa de mostrar o dela — dois avisos com a mesma frase, um embaixo
// do outro, era o que o detalhe do processo mostrava sem sinal. Casado com o
// caminho pela mesma regra dos ids: a dispensa de uma tela não vale na seguinte.
export function avisoProprioPara(publicado, pathname) {
  return Boolean(publicado && publicado.pathname === pathname && publicado.avisoProprio === true);
}

// A faixa mostra o aviso quando o contexto veio do espelho E a tela não disse
// que o mostra ela mesma.
export const faixaMostraAviso = ({ fromCache, avisoProprio }) => Boolean(fromCache) && !avisoProprio;

// ── O link que leva o caminho de volta ────────────────────────────────────
// Os botões de lançamento da ficha financeira (item 5) abrem formulários que
// devem voltar ao processo depois de salvar. O destino viaja na URL, validado
// na ida e na volta por `voltarValido`.
export function comVoltar(destino, voltar) {
  const valido = voltarValido(voltar);
  if (!valido) return destino;
  const sep = destino.includes('?') ? '&' : '?';
  return `${destino}${sep}voltar=${encodeURIComponent(valido)}`;
}

// Para onde o formulário vai depois de salvar (e no Cancelar): o `?voltar=`
// válido, ou o destino de sempre da tela. Recebe o VALOR cru do parâmetro
// (`searchParams.get('voltar')`), que é o que as telas já têm na mão.
export const destinoDepoisDeSalvar = (voltar, padrao) => voltarValido(voltar) ?? padrao;
