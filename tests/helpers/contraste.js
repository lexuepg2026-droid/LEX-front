// ═══════════════════════════════════════════════════════════════════════════
// Contraste WCAG 2.x a partir de `src/styles/variables.css` (Fase 1, DEC-076)
//
// Funções puras, sem DOM e sem dependência: lê os tokens dos dois modos,
// resolve `var()` e compõe as cores com alfa sobre o fundo real antes de medir.
// A fórmula é a mesma do inventário do porte (seção 2.3): luminância relativa
// do WCAG 2.x, razão (L1 + 0,05) / (L2 + 0,05).
//
// ── Por que compor o alfa ─────────────────────────────────────────────────
// `--color-success-bg` é translúcido. Medir o texto contra ele "puro" mede uma
// cor que não existe na tela: o que o olho vê é o `-bg` misturado com a surface
// que está embaixo. Por isso cada par declara sobre o que o fundo pousa.
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from "node:fs";

export const CAMINHO_VARIAVEIS = new URL("../../src/styles/variables.css", import.meta.url).pathname;

const semComentarios = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

// Declarações `--nome: valor;` do PRIMEIRO bloco cujo seletor é exatamente `seletor`.
const declaracoesDoBloco = (css, seletor) => {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = css.match(new RegExp(`(^|\\})\\s*${escapado}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`bloco ${seletor} não encontrado em variables.css`);
  const tokens = {};
  for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens[d[1]] = d[2].trim();
  return tokens;
};

// Tokens de cada modo. O claro herda do escuro tudo o que não redefine, como no navegador.
export const lerModos = (caminho = CAMINHO_VARIAVEIS) => {
  const css = semComentarios(readFileSync(caminho, "utf8"));
  const escuro = declaracoesDoBloco(css, ":root");
  const claro = { ...escuro, ...declaracoesDoBloco(css, "body.light-mode") };
  return { escuro, claro };
};

// Resolve `var(--x)` (com ou sem fallback) até chegar a um valor literal.
export const resolver = (tokens, nome, pilha = []) => {
  if (pilha.includes(nome)) throw new Error(`referência circular: ${[...pilha, nome].join(" → ")}`);
  const valor = tokens[nome];
  if (valor === undefined) throw new Error(`token ${nome} não definido`);
  const m = valor.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/);
  if (!m) return valor;
  if (tokens[m[1]] === undefined && m[2]) return m[2].trim();
  return resolver(tokens, m[1], [...pilha, nome]);
};

// `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb()` e `rgba()` → { r, g, b, a } com r/g/b em 0–255.
export const parseCor = (texto) => {
  const t = texto.trim().toLowerCase();
  let m = t.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) throw new Error(`hex inválido: ${texto}`);
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  m = t.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const partes = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    const [r, g, b, a = 1] = partes;
    if ([r, g, b, a].some(Number.isNaN)) throw new Error(`rgb inválido: ${texto}`);
    return { r, g, b, a };
  }
  throw new Error(`cor não reconhecida: ${texto}`);
};

// Composição "source-over" de `frente` sobre `fundo` (fundo já opaco).
export const compor = (frente, fundo) => {
  const a = frente.a;
  return {
    r: frente.r * a + fundo.r * (1 - a),
    g: frente.g * a + fundo.g * (1 - a),
    b: frente.b * a + fundo.b * (1 - a),
    a: 1
  };
};

const canal = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminancia = ({ r, g, b }) => 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);

export const razao = (c1, c2) => {
  const [l1, l2] = [luminancia(c1), luminancia(c2)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

export const paraHex = ({ r, g, b }) =>
  "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();

// Cor opaca de um token. Se for translúcida, pousa sobre `sobre` (token, ou
// cadeia de tokens do mais de cima para o mais de baixo), terminando em `--color-bg`.
export const corOpaca = (tokens, nome, sobre = []) => {
  const camadas = [nome, ...[].concat(sobre)];
  if (camadas[camadas.length - 1] !== "--color-bg") camadas.push("--color-bg");
  let base = parseCor(resolver(tokens, camadas[camadas.length - 1]));
  if (base.a < 1) throw new Error("--color-bg precisa ser opaco");
  for (let i = camadas.length - 2; i >= 0; i--) {
    base = compor(parseCor(resolver(tokens, camadas[i])), base);
  }
  return base;
};

// Mede um par { texto, fundo, sobre?, limite } num modo.
export const medirPar = (tokens, par) => {
  const fundo = corOpaca(tokens, par.fundo, par.sobre ?? (par.fundo === "--color-bg" ? [] : ["--color-surface"]));
  const frente = compor(parseCor(resolver(tokens, par.texto)), fundo);
  return { razao: razao(frente, fundo), frente: paraHex(frente), fundo: paraHex(fundo) };
};
