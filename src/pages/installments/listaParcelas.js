// ═══════════════════════════════════════════════════════════════════════════
// A LISTA DE PARCELAS — a situação do REGISTRO (Fase 3.7, DEC-132)
//
// O checkbox "Mostrar desativadas" virou a pílula "Situação do registro", no
// desenho de Clientes e Processos (DEC-052/121), na URL e alcançada pelo
// "Limpar filtros".
//
// **A chave é `?registro=`, e não `?situacao=`.** Nas três listas financeiras
// `?situacao=` já é o STATUS da parcela (`pendente`, `vencido`…, DEC-103), e
// o "Ver todas" das vencidas da Visão geral depende disso
// (`?situacao=vencido`). Clientes e Processos não têm esse conflito: lá o
// status jurídico se chama `andamento`.
//
// **Duas opções, sem "Ativas e desativadas".** O back de parcelas só tem o
// modo `?inativos=true`, que lista SÓ as desativadas — e é modo de propósito
// (Fase 4.5): misturar os conjuntos faria a tabela somar o que foi removido
// sem nada dizendo isso na linha. Decisão do Daniel na 3.7: o "todos" fica de
// fora em Parcelas, e o back não muda.
// ═══════════════════════════════════════════════════════════════════════════

export const REGISTRO_PARCELA_OPTIONS = Object.freeze([
  { value: '', label: 'Somente ativas' },
  { value: 'inativos', label: 'Somente desativadas' },
]);

// O valor da URL, normalizado: só `inativos` é reconhecido. Um link torto
// (`?registro=todos`, `?registro=x`) abre as ativas, como o `?mes=` inválido
// do Início — e nunca um 400 por uma escolha que a tela não oferece.
export const registroDaUrl = (valor) => (valor === 'inativos' ? 'inativos' : '');

// O parâmetro da API: o modo `inativos=true` do back, ou nada.
export const inativosDaConsulta = (registro) =>
  (registroDaUrl(registro) === 'inativos' ? 'true' : undefined);

// O trecho de "Filtros aplicados".
export const trechoDoRegistro = (registro) =>
  (registroDaUrl(registro) === 'inativos' ? 'somente desativadas' : null);

export default { REGISTRO_PARCELA_OPTIONS, registroDaUrl, inativosDaConsulta, trechoDoRegistro };
