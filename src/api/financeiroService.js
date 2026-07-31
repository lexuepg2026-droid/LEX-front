import api from './axiosConfig';

const getResumo = () => api.get('/financeiro/resumo');

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
