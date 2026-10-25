// ═══════════════════════════════════════════════════════════════════════════
// OS DESTINOS DA NAVEGAÇÃO — um mapa só para o cabeçalho e a barra de baixo
// (Fase 2a, DEC-079)
//
// Até a Fase 1 eram duas listas: os 13 itens da Sidebar e os 7 da BottomNav,
// escritas à mão e livres para divergir. Agora o cabeçalho (≥ 1024 px) e a
// barra de baixo com o painel "Mais" (< 1024 px) leem DAQUI. Um destino novo
// entra uma vez e aparece nas duas larguras.
//
// Arquivo `.js`, e não `.jsx`: a suíte é `node --test` sem JSX, e a regra de
// "qual item está ativo" precisa ser executada, não só lida.
//
// ── Os 13 destinos da Sidebar, todos aqui ─────────────────────────────────
// Início, Clientes, Processos e Agenda viram links diretos; Financeiro (com
// Honorários, Parcelas e Pagamentos) e Documentos (com as duas portas da
// montagem e Seções) viram submenus; Perfil foi para o menu do usuário. Nenhum
// sumiu — `tests/regressions/fase2a.test.js` confere a lista.
// ═══════════════════════════════════════════════════════════════════════════

// Links de primeiro nível. `end` = só ativo na rota exata (o Início não pode
// acender em toda tela que começa com `/dashboard`).
export const LINKS_PRINCIPAIS = [
  { to: '/dashboard',           label: 'Início',    end: true },
  { to: '/dashboard/clientes',  label: 'Clientes'  },
  { to: '/dashboard/processos', label: 'Processos' },
  // "Agenda", e não "Calendário" como no desenho dela: é a palavra da rota,
  // da trilha e da própria tela (F-3).
  { to: '/dashboard/agenda',    label: 'Agenda'    },
];

// As duas portas da montagem continuam SEPARADAS (decisão da F-2b do módulo de
// documentos): a advogada decide o que está fazendo antes de entrar. As duas
// levam ao mesmo caminho e se distinguem só pelo `?modo=`.
export const GRUPOS = [
  {
    id: 'financeiro',
    label: 'Financeiro',
    itens: [
      { to: '/dashboard/financeiro', label: 'Visão geral' },
      { to: '/dashboard/honorarios', label: 'Honorários'  },
      { to: '/dashboard/parcelas',   label: 'Parcelas'    },
      { to: '/dashboard/pagamentos', label: 'Pagamentos'  },
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos',
    itens: [
      { to: '/dashboard/documentos', label: 'Documentos', end: true },
      { to: '/dashboard/documentos/montar?modo=documento', label: 'Gerar documento', modo: 'documento' },
      { to: '/dashboard/documentos/montar?modo=modelo',    label: 'Montar modelo',   modo: 'modelo'    },
      { to: '/dashboard/secoes',     label: 'Seções'     },
    ],
  },
];

// O que mora no menu do usuário e, no celular, no fim do painel "Mais".
export const PERFIL = { to: '/dashboard/perfil', label: 'Perfil' };

// A fila offline (F-5b). Não tinha item na Sidebar — chega-se pelo contador
// ao lado do sino —, mas no celular o contador é pequeno, e o painel "Mais" a
// lista por extenso.
export const PENDENCIAS = { to: '/dashboard/pendencias', label: 'Pendências' };

const caminhoDe = (to) => to.split('?')[0];

// Um item está ativo quando a rota atual é ele, ou está DENTRO dele
// (`/dashboard/clientes/editar/1` acende Clientes). Para as duas portas da
// montagem, quem decide é o `?modo=`: o caminho é o mesmo, e sem esta conta as
// duas acenderiam juntas — o defeito que a Sidebar já tratava.
export function itemAtivo(item, { pathname, search = '' }) {
  const caminho = caminhoDe(item.to);
  if (item.modo) {
    const modo = new URLSearchParams(search).get('modo');
    return pathname.startsWith(caminho) && modo === item.modo;
  }
  if (item.end) return pathname === caminho || pathname === `${caminho}/`;
  return pathname === caminho || pathname.startsWith(`${caminho}/`);
}

// `/dashboard/documentos/montar` começa com `/dashboard/documentos`, mas não é
// a LISTA de documentos: a lista é `end`, e a montagem é das portas.
export function grupoAtivo(grupo, local) {
  return grupo.itens.some((item) => itemAtivo(item, local));
}

// O "Mais" acende quando a rota atual é um destino que só ele alcança.
export function maisAtivo(local) {
  return GRUPOS.some((g) => grupoAtivo(g, local))
    || itemAtivo(PERFIL, local)
    || itemAtivo(PENDENCIAS, local);
}

// Os 13 destinos, na ordem da Sidebar antiga — para o teste conferir que
// nenhum se perdeu na mudança.
export function todosOsDestinos() {
  return [
    LINKS_PRINCIPAIS[0], LINKS_PRINCIPAIS[1], LINKS_PRINCIPAIS[2], LINKS_PRINCIPAIS[3],
    ...GRUPOS[0].itens, ...GRUPOS[1].itens, PERFIL,
  ].map((d) => d.to);
}

// "Olá, Daniel" e "DS": as duas leituras do nome que o cabeçalho mostra.
export function primeiroNome(nomeCompleto) {
  return (nomeCompleto || '').trim().split(/\s+/)[0] || '';
}

// A mesma conta do `getInitials` do Header antigo: as duas primeiras palavras.
export function iniciais(nomeCompleto) {
  const partes = (nomeCompleto || '').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  return partes.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
