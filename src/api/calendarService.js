import api from './axiosConfig';

// ── A LEITURA AGREGADA ───────────────────────────────────────────────────
//
// Um endpoint, um intervalo, as duas naturezas de volta. `de` e `ate` são
// OBRIGATÓRIOS — um calendário sempre sabe a janela que está mostrando, e o
// backend recusa a chamada sem eles.
//
// As datas vão e voltam como `AAAA-MM-DD`. Nenhuma conversão neste arquivo, e
// nenhuma `new Date(...)`: é a decisão de fuso da F-3, e o valor que chega é o
// valor que a tela usa.
const getCalendar = ({ de, ate, processoId } = {}) => {
  const params = { de, ate };
  if (processoId) params.processoId = processoId;
  return api.get('/calendar', { params });
};

// O sino. Sem parâmetro: "hoje" é do servidor, e o navegador não tem como
// saber qual é — um relógio de máquina atrasado destacaria o dia errado.
const getAvisos = () => api.get('/calendar/avisos');

export default { getCalendar, getAvisos };
