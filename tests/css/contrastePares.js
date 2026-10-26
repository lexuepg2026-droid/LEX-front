// Os pares que `contraste.test.js` mede nos dois modos (Fase 1, DEC-076).
//
// `texto` é a cor da frente e `fundo`, a de trás. `sobre` é onde o fundo pousa
// quando ele é translúcido: por padrão a surface (os `-bg` semânticos vivem em
// card, badge e tabela), e `--color-bg` no fim de toda cadeia.
//
// Limites do WCAG 2.x: 4,5:1 para texto; 3:1 para texto grande e para o que não
// é texto (borda de campo, anel de foco).

export const TEXTO = 4.5;
export const NAO_TEXTO = 3;

const SEMANTICAS = ["success", "warning", "danger", "info"];

export const PARES = [
  // Texto base sobre os três planos.
  ...["--color-bg", "--color-surface", "--color-surface-raised"].flatMap((fundo) => [
    { nome: `texto primário / ${fundo}`, texto: "--color-text-primary", fundo, limite: TEXTO },
    { nome: `texto secundário / ${fundo}`, texto: "--color-text-secondary", fundo, limite: TEXTO }
  ]),
  { nome: "texto discreto / --color-surface", texto: "--color-text-discreto", fundo: "--color-surface", limite: TEXTO },
  { nome: "texto discreto / --color-bg", texto: "--color-text-discreto", fundo: "--color-bg", limite: TEXTO },
  { nome: "texto discreto / --color-surface-raised", texto: "--color-text-discreto", fundo: "--color-surface-raised", limite: TEXTO },
  { nome: "texto secundário / --color-surface-input", texto: "--color-text-secondary", fundo: "--color-surface-input", limite: TEXTO },

  // Destaque e verde de texto: os dois aparecem como `color:` em dezenas de regras
  // (rótulos, títulos de seção, marcadores da linha do tempo).
  { nome: "destaque (accent) / --color-surface", texto: "--color-accent", fundo: "--color-surface", limite: TEXTO },
  { nome: "destaque (accent) / --color-bg", texto: "--color-accent", fundo: "--color-bg", limite: TEXTO },
  { nome: "verde de texto (primary-light) / --color-surface", texto: "--color-primary-light", fundo: "--color-surface", limite: TEXTO },

  // Cada semântica: o texto dela sobre a surface e sobre o próprio fundo esmaecido (badge).
  ...SEMANTICAS.flatMap((s) => [
    { nome: `${s} texto / --color-surface`, texto: `--color-${s}-text`, fundo: "--color-surface", limite: TEXTO },
    { nome: `${s} texto / --color-${s}-bg (badge)`, texto: `--color-${s}-text`, fundo: `--color-${s}-bg`, limite: TEXTO }
  ]),

  // Botões sólidos.
  { nome: "botão primário", texto: "--color-on-primary", fundo: "--color-primary", limite: TEXTO },
  // Só no escuro: no claro o token é transparente e não há borda a medir.
  { nome: "borda do botão primário / --color-surface", texto: "--color-btn-primario-borda", fundo: "--color-surface", limite: NAO_TEXTO, modos: ["escuro"] },
  { nome: "borda do botão primário / --color-bg", texto: "--color-btn-primario-borda", fundo: "--color-bg", limite: NAO_TEXTO, modos: ["escuro"] },
  { nome: "botão de perigo", texto: "--color-on-solid", fundo: "--color-danger-solid", limite: TEXTO },
  { nome: "selo do sino (texto sobre o amarelo pleno)", texto: "--color-on-warning", fundo: "--color-warning", limite: TEXTO },

  // Link.
  { nome: "link / --color-surface", texto: "--color-link", fundo: "--color-surface", limite: TEXTO },
  { nome: "link / --color-bg", texto: "--color-link", fundo: "--color-bg", limite: TEXTO },
  // A faixa de contexto (Fase 2b, DEC-085): o "Voltar" sobre o realce de
  // hover. O link, o rótulo e o texto da faixa já são pares de cima (link,
  // texto primário e secundário sobre a surface).
  { nome: "ficha: botão de lançamento / --color-surface-raised (hover)", texto: "--color-link", fundo: "--color-surface-raised", limite: TEXTO },
  { nome: "faixa de contexto: Voltar / --color-surface-raised (hover)", texto: "--color-text-primary", fundo: "--color-surface-raised", limite: TEXTO },

  // Toasts sólidos (texto branco, como os dela).
  { nome: "toast success", texto: "--color-on-solid", fundo: "--color-success-solid", limite: TEXTO },
  { nome: "toast error", texto: "--color-on-solid", fundo: "--color-danger-solid", limite: TEXTO },
  { nome: "toast info", texto: "--color-on-solid", fundo: "--color-info-solid", limite: TEXTO },
  // O × dos toasts (Fase 2b, DEC-083): o branco sobre o realce de hover, que
  // pousa no fundo sólido de cada tom, e o anel de foco branco (não texto).
  ...["success", "danger", "info"].flatMap((tom) => [
    { nome: `toast ${tom}: × sobre o realce`, texto: "--color-on-solid", fundo: "--color-toast-fechar-hover", sobre: [`--color-${tom}-solid`], limite: TEXTO },
    { nome: `toast ${tom}: anel de foco do ×`, texto: "--color-on-solid", fundo: `--color-${tom}-solid`, limite: NAO_TEXTO },
  ]),

  // Cartão de resumo do Início (item 2 da banca): valor, rótulo e nota.
  ...["--color-text-primary", "--color-text-secondary", "--color-text-discreto", "--color-accent",
    ...SEMANTICAS.map((x) => `--color-${x}-text`)].map((texto) => (
    { nome: `${texto} / --color-surface-card (cartão)`, texto, fundo: "--color-surface-card", limite: TEXTO }
  )),

  // A marca fixa (Fase 2a, DEC-078): cabeçalho e autenticação. Os tokens são
  // os mesmos nos dois modos, e os pares rodam nos dois do mesmo jeito.
  { nome: "marca: texto / --color-marca-fundo", texto: "--color-marca-texto", fundo: "--color-marca-fundo", limite: TEXTO },
  { nome: "marca: texto / --color-marca-escuro", texto: "--color-marca-texto", fundo: "--color-marca-escuro", limite: TEXTO },
  { nome: "marca: link não ativo / --color-marca-fundo", texto: "--color-marca-texto-suave", fundo: "--color-marca-fundo", limite: TEXTO },
  { nome: "marca: texto / realce de hover", texto: "--color-marca-texto", fundo: "--color-marca-realce", sobre: ["--color-marca-fundo"], limite: TEXTO },
  { nome: "marca: botão claro", texto: "--color-on-marca-botao", fundo: "--color-marca-botao", limite: TEXTO },
  { nome: "marca: botão claro em hover", texto: "--color-on-marca-botao", fundo: "--color-marca-botao-hover", limite: TEXTO },
  { nome: "marca: erro / --color-marca-fundo", texto: "--color-marca-erro", fundo: "--color-marca-fundo", limite: TEXTO },
  { nome: "marca: erro / --color-marca-escuro", texto: "--color-marca-erro", fundo: "--color-marca-escuro", limite: TEXTO },
  { nome: "marca: borda de campo / --color-marca-fundo", texto: "--color-marca-borda-campo", fundo: "--color-marca-fundo", limite: NAO_TEXTO },
  { nome: "marca: anel de foco / --color-marca-fundo", texto: "--color-marca-foco", fundo: "--color-marca-fundo", limite: NAO_TEXTO },
  { nome: "marca: anel de foco / --color-marca-escuro", texto: "--color-marca-foco", fundo: "--color-marca-escuro", limite: NAO_TEXTO },
  { nome: "marca: ponto de alerta do avatar / --color-marca-fundo", texto: "--color-marca-alerta", fundo: "--color-marca-fundo", limite: NAO_TEXTO },
  // O portal na pele da Figura 15 (Fase 2.5, DEC-096): cartões escuros
  // sobre o verde, o realce bege translúcido por cima do escuro, e as três
  // mensagens (erro, alerta, sucesso) com a cor no texto.
  { nome: "portal: texto suave / --color-marca-escuro", texto: "--color-marca-texto-suave", fundo: "--color-marca-escuro", limite: TEXTO },
  { nome: "portal: texto / realce sobre o escuro", texto: "--color-marca-texto", fundo: "--color-marca-realce", sobre: ["--color-marca-escuro"], limite: TEXTO },
  { nome: "portal: texto suave / realce sobre o escuro", texto: "--color-marca-texto-suave", fundo: "--color-marca-realce", sobre: ["--color-marca-escuro"], limite: TEXTO },
  { nome: "portal: erro / realce sobre o escuro", texto: "--color-marca-erro", fundo: "--color-marca-realce", sobre: ["--color-marca-escuro"], limite: TEXTO },
  { nome: "portal: alerta / realce sobre o escuro", texto: "--color-marca-alerta", fundo: "--color-marca-realce", sobre: ["--color-marca-escuro"], limite: TEXTO },
  { nome: "portal: sucesso / realce sobre o escuro", texto: "--color-marca-sucesso", fundo: "--color-marca-realce", sobre: ["--color-marca-escuro"], limite: TEXTO },
  { nome: "portal: selo de alerta / --color-marca-escuro", texto: "--color-marca-alerta", fundo: "--color-marca-escuro", limite: TEXTO },
  { nome: "portal: cartão de processo em hover", texto: "--color-marca-texto", fundo: "--color-marca-escuro-hover", limite: TEXTO },
  { nome: "portal: texto suave / cartão em hover", texto: "--color-marca-texto-suave", fundo: "--color-marca-escuro-hover", limite: TEXTO },
  { nome: "portal: borda de campo / --color-marca-escuro", texto: "--color-marca-borda-campo", fundo: "--color-marca-escuro", limite: NAO_TEXTO },
  { nome: "portal: botão secundário em hover", texto: "--color-marca-texto", fundo: "--color-marca-realce", sobre: ["--color-marca-escuro"], limite: TEXTO },
  { nome: "marca: avatar (iniciais bege) / --color-marca-fundo", texto: "--color-marca-texto", fundo: "--color-marca-fundo", limite: TEXTO },

  // O aviso de e-mail não confirmado (A-2; compacto desde a Fase 2b, DEC-088):
  // o amarelo translúcido pousa no fundo da página, e o hover dos botões o
  // empilha mais uma vez.
  { nome: "aviso de e-mail: texto / --color-warning-bg", texto: "--color-text-primary", fundo: "--color-warning-bg", sobre: ["--color-bg"], limite: TEXTO },
  { nome: "aviso de e-mail: botão em hover", texto: "--color-text-primary", fundo: "--color-warning-bg", sobre: ["--color-warning-bg", "--color-bg"], limite: TEXTO },
  { nome: "aviso de e-mail: resposta ok", texto: "--color-success-text", fundo: "--color-warning-bg", sobre: ["--color-bg"], limite: TEXTO },
  { nome: "aviso de e-mail: resposta de erro", texto: "--color-danger-text", fundo: "--color-warning-bg", sobre: ["--color-bg"], limite: TEXTO },

  // "Confirmar e-mail" no menu do usuário e no "Mais" (DEC-088), em repouso e
  // sobre o realce de hover do item.
  { nome: "menu: Confirmar e-mail / --color-surface", texto: "--color-warning-text", fundo: "--color-surface", limite: TEXTO },
  { nome: "menu: Confirmar e-mail / --color-accent-muted (hover)", texto: "--color-warning-text", fundo: "--color-accent-muted", sobre: ["--color-surface"], limite: TEXTO },

  // "Liberado no portal" (Fase 2.5, DEC-097): o trilho ligado e o desligado
  // contra a superfície (não texto), o botão branco sobre o trilho ligado, e
  // o texto do aviso de desligamento.
  { nome: "liberação: trilho ligado / --color-surface", texto: "--color-success-solid", fundo: "--color-surface", limite: NAO_TEXTO },
  { nome: "liberação: botão / trilho ligado", texto: "--color-on-solid", fundo: "--color-success-solid", limite: NAO_TEXTO },
  { nome: "liberação: botão desligado / --color-surface", texto: "--color-text-secondary", fundo: "--color-surface", limite: NAO_TEXTO },
  { nome: "liberação: aviso de desligar / --color-surface", texto: "--color-warning-text", fundo: "--color-surface", limite: TEXTO },
  { nome: "liberação: Desligar / --color-surface", texto: "--color-danger-text", fundo: "--color-surface", limite: TEXTO },

  // O Início na pele nova (Fase 3.1, DEC-100): o selo da data (dia e mês
  // creme sobre o verde pleno), as duas pílulas das Datas próximas em repouso
  // (sobre o balão) e com a linha em hover (o realce por baixo), e o texto
  // das ações rápidas e do seletor do mês sobre os seus fundos.
  { nome: "Início: selo da data / --color-primary", texto: "--color-on-primary", fundo: "--color-primary", limite: TEXTO },
  { nome: "Início: pílula Vencimento / balão", texto: "--color-warning-text", fundo: "--color-warning-bg", sobre: ["--color-surface"], limite: TEXTO },
  { nome: "Início: pílula Compromisso / balão", texto: "--color-info-text", fundo: "--color-info-bg", sobre: ["--color-surface"], limite: TEXTO },
  { nome: "Início: pílula Vencimento / linha em hover", texto: "--color-warning-text", fundo: "--color-warning-bg", sobre: ["--color-surface-raised"], limite: TEXTO },
  { nome: "Início: pílula Compromisso / linha em hover", texto: "--color-info-text", fundo: "--color-info-bg", sobre: ["--color-surface-raised"], limite: TEXTO },
  { nome: "Início: título da data / linha em hover", texto: "--color-text-primary", fundo: "--color-surface-raised", limite: TEXTO },
  { nome: "Início: subtítulo da data / linha em hover", texto: "--color-text-secondary", fundo: "--color-surface-raised", limite: TEXTO },
  { nome: "Início: ação rápida / --color-surface-card", texto: "--color-text-primary", fundo: "--color-surface-card", limite: TEXTO },
  { nome: "Início: ação rápida em hover", texto: "--color-text-primary", fundo: "--color-surface-raised", limite: TEXTO },

  // As listas financeiras no balão da Figura 19 (Fase 3.2, DEC-102). A tabela
  // passou a pousar na `--color-surface` (o balão) em vez do `--color-bg`. O
  // hover da linha dentro do balão é `--color-surface-raised`, e não o
  // `--color-accent-muted` da tabela: composto sobre a surface, ele derrubava
  // os badges danger e info do escuro para 4,44:1 e 4,35:1 (medido aqui).
  { nome: "lista: total do título / balão", texto: "--color-text-secondary", fundo: "--color-surface", limite: TEXTO },
  { nome: "lista: busca (texto e lupa) / campo", texto: "--color-text-primary", fundo: "--color-surface-input", limite: TEXTO },
  { nome: "lista: \"+\" em hover", texto: "--color-text-primary", fundo: "--color-surface-raised", limite: TEXTO },
  { nome: "lista: célula / linha em hover", texto: "--color-text-primary", fundo: "--color-surface-raised", limite: TEXTO },
  { nome: "lista: link do nome / balão", texto: "--color-accent", fundo: "--color-surface", limite: TEXTO },
  { nome: "lista: link do nome / linha em hover", texto: "--color-accent", fundo: "--color-surface-raised", limite: TEXTO },
  ...SEMANTICAS.flatMap((sm) => [
    { nome: `lista: badge ${sm} / balão`, texto: `--color-${sm}-text`, fundo: `--color-${sm}-bg`, sobre: ["--color-surface"], limite: TEXTO },
    { nome: `lista: badge ${sm} / linha em hover`, texto: `--color-${sm}-text`, fundo: `--color-${sm}-bg`, sobre: ["--color-surface-raised"], limite: TEXTO }
  ]),
  // O Início na 3.2 (DEC-104): os links do cartão de confirmações e do de
  // processos não liberados, e a lista curta, todos na `--color-surface-card`.
  { nome: "Início: link do cartão / --color-surface-card", texto: "--color-accent", fundo: "--color-surface-card", limite: TEXTO },
  { nome: "Início: quantidade da lista curta / --color-surface-card", texto: "--color-text-secondary", fundo: "--color-surface-card", limite: TEXTO },
  { nome: "Início: valor de atenção (não liberados) / --color-surface-card", texto: "--color-warning-text", fundo: "--color-surface-card", limite: TEXTO },
  // A coluna de ações fixa à direita (Fase 3.3, DEC-107): o ⋮ e as notas da
  // célula ("Reparcelada", "sem recibo"), ambos `--color-text-secondary`,
  // sobre os fundos opacos da coluna — no fundo da página (embutida no
  // Financeiro), com o realce composto do hover, e no balão.
  { nome: "ações fixas: ⋮ e nota / fundo da página", texto: "--color-text-secondary", fundo: "--color-bg", limite: TEXTO },
  { nome: "ações fixas: ⋮ e nota / linha em hover (fundo da página)", texto: "--color-text-secondary", fundo: "--color-accent-muted", sobre: ["--color-bg"], limite: TEXTO },
  { nome: "ações fixas: ⋮ e nota / balão", texto: "--color-text-secondary", fundo: "--color-surface", limite: TEXTO },
  { nome: "ações fixas: ⋮ e nota / linha em hover (balão)", texto: "--color-text-secondary", fundo: "--color-surface-raised", limite: TEXTO },
  { nome: "lista: borda da busca em pílula / balão", texto: "--color-border-input", fundo: "--color-surface", limite: NAO_TEXTO },

  // Não texto.
  { nome: "borda de campo / --color-surface-input", texto: "--color-border-input", fundo: "--color-surface-input", limite: NAO_TEXTO },
  { nome: "borda de campo / --color-surface", texto: "--color-border-input", fundo: "--color-surface", limite: NAO_TEXTO },
  { nome: "anel de foco / --color-bg", texto: "--color-focus", fundo: "--color-bg", limite: NAO_TEXTO },
  { nome: "anel de foco / --color-surface", texto: "--color-focus", fundo: "--color-surface", limite: NAO_TEXTO }
];
