import api from './axiosConfig';

// `mes` (Fase 3.1, DEC-098): `"AAAA-MM"` escolhe o mês dos campos do mês
// (`aReceberNoMes`, `recebidoNoMes`, `mesReferencia`). Omitido, o backend usa o
// mês corrente dele — e o parâmetro nem vai na URL, para a chamada sem mês
// continuar sendo a mesma de antes.
const getResumo = (mes) =>
  api.get('/financeiro/resumo', mes ? { params: { mes } } : undefined);

// Ficha financeira de UM processo (Fase 4.1). Responde FORA do envelope de
// listagem — `{ processo, totais, honorarios, geradoEm }`, sem `data`, `page`
// nem `total` —, porque ali não há listagem: há um processo, uma árvore embaixo
// e três totais em cima. Não escrever `res.data.data ?? res.data` aqui.
//
// Os totais vêm calculados do backend, nos três níveis. A tela EXIBE e não
// recalcula: somar no cliente seria somar o que foi baixado, e no dia em que a
// ficha ganhar recorte o total viraria o do recorte sem ninguém notar.
const getFichaDoProcesso = (processoId) =>
  api.get(`/financeiro/processos/${processoId}`);

export default { getResumo, getFichaDoProcesso };
