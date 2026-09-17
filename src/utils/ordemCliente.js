// ═══════════════════════════════════════════════════════════════════════════
// A ORDENAÇÃO DA LISTAGEM DE CLIENTES — o vocabulário, num lugar só (DEC-062)
//
// Espelha `ORDENACOES_CLIENTE` do backend (`utils/filtrosDeConsulta.js`), pela
// mesma razão de `FASE_PROCESSO_OPTIONS` e de `TIPO_EVENTO_OPTIONS`: é
// **constante, não dado**. Uma rota `/ordenacoes` custaria uma viagem de rede
// em toda carga de tela para entregar dois valores que não mudam entre
// deploys.
//
// O preço é a duplicação, e ele é aceito do mesmo jeito que nos outros dois:
// **há teste nos dois repos** conferindo que as listas não divergiram. Um
// valor que só existisse aqui viraria 400 na primeira consulta.
//
// ── Valor gravado ≠ rótulo ───────────────────────────────────────────────
// O que vai na query string é `nome_asc`/`nome_desc`; o que a advogada lê é
// "Nome (A–Z)". Trocar o rótulo não muda o contrato — é a separação que a
// DEC-039 estabeleceu para o tipo de honorário e que vale para todo
// vocabulário do projeto desde então.
// ═══════════════════════════════════════════════════════════════════════════

// O PADRÃO é A–Z, e isso é mudança de comportamento deliberada da A-1: até
// aqui a listagem saía por data de cadastro, que não significa nada para quem
// procura um nome. Quem não mexer no seletor vê a lista em ordem alfabética.
export const ORDEM_CLIENTE_PADRAO = 'nome_asc';

export const ORDENS_CLIENTE = Object.freeze([
  { valor: 'nome_asc', rotulo: 'Nome (A–Z)' },
  { valor: 'nome_desc', rotulo: 'Nome (Z–A)' }
]);

// Só os valores, para a varredura de paridade com o backend não depender da
// forma do objeto de rótulos.
export const VALORES_ORDEM_CLIENTE = Object.freeze(ORDENS_CLIENTE.map((o) => o.valor));

export default ORDENS_CLIENTE;
