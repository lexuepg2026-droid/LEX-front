// ═══════════════════════════════════════════════════════════════════════════
// A IDADE DO DADO — dado offline nunca se apresenta como dado ao vivo (F-5a)
//
// ── Por que isto é regra, e não enfeite ──────────────────────────────────
// Um saldo de parcela de duas horas atrás, exibido igual a um saldo de agora,
// faz a advogada dizer um número errado ao cliente no telefone — e ela não teria
// como saber que precisava desconfiar. É a mesma regra da **DEC-044**: o que
// deixou de ser confiável diz que deixou. Lá era a linha do extrato que não
// entra na soma; aqui é a tela inteira servida do banco local.
//
// A hora exibida é a da **última atualização daquele dado** — o instante em que
// ele veio do servidor —, nunca a hora atual. Exibir a hora atual seria a
// mentira exata que este arquivo existe para não contar.
//
// ── Por que `formatters.formatDate` NÃO é reusado aqui ───────────────────
// `formatDate` formata em **UTC**, de propósito: ele existe para as datas
// `"AAAA-MM-DD"` do domínio, que não têm fuso a errar (ver "A data NÃO vira
// `Date` em lugar nenhum da tela", F-3). O que se formata AQUI é outra coisa —
// um **instante** (`Date.now()`), e instante se lê no fuso de quem olha. Em
// UTC, um carregamento das 22:00 de Curitiba apareceria como "01:00 de amanhã".
//
// São dois tipos diferentes com duas regras diferentes; usar o mesmo formatador
// para os dois é que seria o defeito. A regra da F-3 continua valendo integral:
// **nenhuma data do domínio vira `Date`** — e nada aqui recebe data do domínio.
// ═══════════════════════════════════════════════════════════════════════════

const ehInstanteValido = (ms) => typeof ms === 'number' && Number.isFinite(ms) && ms > 0;

const horaLocal = (data) =>
  data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

const diaLocal = (data) =>
  `${String(data.getDate()).padStart(2, '0')}/` +
  `${String(data.getMonth() + 1).padStart(2, '0')}/` +
  `${data.getFullYear()}`;

// Distância em DIAS DE CALENDÁRIO locais, e não em horas: às 00:30, um dado das
// 23:50 tem 40 minutos de idade e é de **ontem**. Quem lê "ontem às 23:50"
// entende na hora; "há 40 minutos" esconderia a virada do dia, que é justamente
// quando um vencimento muda de lado.
const diasDeDiferenca = (a, b) => {
  const meiaNoite = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((meiaNoite(b) - meiaNoite(a)) / 86400000);
};

// "hoje às 14:32", "ontem às 09:05", "26/08/2026 às 17:40".
// Devolve `null` quando não há instante — quem chama decide o que dizer, e
// inventar "agora" aqui seria a mentira que a Parte 3 proíbe.
export const formatUpdatedAt = (atualizadoEm, agora = Date.now()) => {
  if (!ehInstanteValido(atualizadoEm)) return null;

  const quando = new Date(atualizadoEm);
  const referencia = new Date(ehInstanteValido(agora) ? agora : Date.now());
  const dias = diasDeDiferenca(quando, referencia);

  // Instante no futuro: relógio do aparelho ajustado para trás depois da
  // gravação. Não se inventa "hoje" nem se esconde — cai na data cheia, que é
  // a forma que não afirma proximidade nenhuma.
  if (dias < 0) return `${diaLocal(quando)} às ${horaLocal(quando)}`;
  if (dias === 0) return `hoje às ${horaLocal(quando)}`;
  if (dias === 1) return `ontem às ${horaLocal(quando)}`;
  return `${diaLocal(quando)} às ${horaLocal(quando)}`;
};

// A frase do topo da tela, em português, quando o que está na tela veio do
// banco local. É a ÚNICA redação — duas telas com duas frases para o mesmo
// estado é o que faz a advogada achar que são dois estados.
export const offlineNoticeText = (atualizadoEm, agora = Date.now()) => {
  const quando = formatUpdatedAt(atualizadoEm, agora);
  return quando
    ? `Sem conexão. Dados de ${quando}.`
    : 'Sem conexão. Esta tela ainda não foi aberta com sinal.';
};
