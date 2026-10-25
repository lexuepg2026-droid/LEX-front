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
  { nome: "botão de perigo", texto: "--color-on-solid", fundo: "--color-danger-solid", limite: TEXTO },

  // Link.
  { nome: "link / --color-surface", texto: "--color-link", fundo: "--color-surface", limite: TEXTO },
  { nome: "link / --color-bg", texto: "--color-link", fundo: "--color-bg", limite: TEXTO },

  // Toasts sólidos (texto branco, como os dela).
  { nome: "toast success", texto: "--color-on-solid", fundo: "--color-success-solid", limite: TEXTO },
  { nome: "toast error", texto: "--color-on-solid", fundo: "--color-danger-solid", limite: TEXTO },
  { nome: "toast info", texto: "--color-on-solid", fundo: "--color-info-solid", limite: TEXTO },

  // Não texto.
  { nome: "borda de campo / --color-surface-input", texto: "--color-border-input", fundo: "--color-surface-input", limite: NAO_TEXTO },
  { nome: "borda de campo / --color-surface", texto: "--color-border-input", fundo: "--color-surface", limite: NAO_TEXTO },
  { nome: "anel de foco / --color-bg", texto: "--color-focus", fundo: "--color-bg", limite: NAO_TEXTO },
  { nome: "anel de foco / --color-surface", texto: "--color-focus", fundo: "--color-surface", limite: NAO_TEXTO }
];
