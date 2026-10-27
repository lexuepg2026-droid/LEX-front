import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Loading from '../../components/common/Loading';
import EmptyState from '../../components/ui/EmptyState';
import Icone from '../../components/ui/Icone';
import OfflineNotice from '../../components/ui/OfflineNotice';
import CartaoDeResumo from '../../components/dashboard/CartaoDeResumo';
import LinhaDeData from '../../components/dashboard/LinhaDeData';
import useCachedResource from '../../hooks/useCachedResource';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import { MENSAGEM_ESCRITA_OFFLINE } from '../../offline/offlineMessages';
import financeiroService from '../../api/financeiroService';
import calendarService from '../../api/calendarService';
import feeService from '../../api/feeService';
import installmentService from '../../api/installmentService';
import paymentService from '../../api/paymentService';
import { formatCurrency } from '../../utils/formatters';
import { contarParcelasVencidas } from '../../utils/painel';
import {
  CARTOES_DO_ACUMULADO,
  CARTAO_VENCIDO_HOJE,
  CARTAO_SALDO_ADIANTADO,
  notaDasVencidas,
  notaDoSaldoAdiantado,
} from '../../components/dashboard/resumoFinanceiro.js';
import {
  ATALHOS,
  DESTINO_DAS_VENCIDAS,
  proximosDoResumo,
  totalDaLista,
  vencidasDoAviso,
} from './visaoGeral.js';
// `module-container` e `error-message` moram aqui; antes chegavam pelas
// listas embutidas, que importavam a folha.
import '../../styles/modules.css';
import './FinanceiroPage.css';

// ═══════════════════════════════════════════════════════════════════════════
// FINANCEIRO — VISÃO GERAL, um painel (Fase 3.7, DEC-130)
//
// Deixou de embutir as três listas: elas têm página própria, no padrão da 3.2,
// a um clique no submenu "Financeiro ▾", e embutidas eram uma segunda cópia de
// cada lista (com filtros no estado, porque três listas na mesma URL brigariam
// pelo `?busca=`). A busca, os filtros e a paginação ficam SÓ nas listas.
//
// Os balões, nesta ordem:
//   1. Resumo — os cartões do Início (`CartaoDeResumo`), com as MESMAS
//      definições (`resumoFinanceiro.js`) e o MESMO `GET /financeiro/resumo`
//      sem mês: os dois painéis nunca discordam. O mês fica no Início.
//   2. Parcelas vencidas — de `GET /calendar/avisos`, a fonte única do número
//      de vencidas (DEC-057), até 8, com "Ver todas".
//   3. Próximos vencimentos — `proximosVencimentos` do mesmo resumo, na linha
//      das Datas próximas (`LinhaDeData`), até 8.
//   4. Atalhos — o total de cada lista e o "+".
//
// Sem donut: o da Raniele somava `recebidoNoMes` (dinheiro que entrou) com
// `aReceberNoMes` (em aberto de parcelas do mês), e a porcentagem não
// significava nada (inventário 3.24).
//
// Offline (DEC-109): só o resumo tem espelho, e é ele que dá o aviso de
// idade — um só. As vencidas e os totais dizem "indisponível sem conexão",
// nunca "nenhuma". Os "+" ficam anunciados como desabilitados, com o motivo:
// o financeiro está fora da fila (DEC-059).
//
// Erros (DEC-084): com o servidor fora, as cinco leituras falham juntas e o
// toast global sai UMA vez (mesma frase, deduplicada — DEC-083). Esta tela
// não emite toast: cada balão diz o seu estado em linha.
// ═══════════════════════════════════════════════════════════════════════════
function FinanceiroPage() {
  const online = useOnlineStatus();

  const {
    data: resumo, loading: carregandoResumo, error: erroResumo, updatedAt, fromCache,
  } = useCachedResource({
    resource: 'financeSummary',
    fetcher: () => financeiroService.getResumo().then((res) => res.data),
    fallbackError: 'Resumo financeiro indisponível no momento.',
  });

  const [avisos, setAvisos] = useState(null);
  const [avisosFalharam, setAvisosFalharam] = useState(false);
  useEffect(() => {
    let ativo = true;
    calendarService.getAvisos()
      .then((res) => { if (ativo) setAvisos(res.data); })
      .catch(() => { if (ativo) setAvisosFalharam(true); });
    return () => { ativo = false; };
  }, [online]);

  // O total de cada lista, pela consulta-padrão dela (`limit: 1`).
  const [totais, setTotais] = useState({});
  useEffect(() => {
    let ativo = true;
    const consultas = {
      honorarios: feeService.listFees({ limit: 1 }),
      parcelas: installmentService.listInstallments({ limit: 1 }),
      pagamentos: paymentService.listPayments({ limit: 1 }),
    };
    for (const [chave, promessa] of Object.entries(consultas)) {
      promessa
        .then((res) => { if (ativo) setTotais((t) => ({ ...t, [chave]: totalDaLista(res) })); })
        .catch(() => { if (ativo) setTotais((t) => ({ ...t, [chave]: null })); });
    }
    return () => { ativo = false; };
  }, [online]);

  const vencidas = vencidasDoAviso(avisos);
  const quantasVencidas = contarParcelasVencidas(avisos);
  const proximos = proximosDoResumo(resumo);
  const indisponivel = !online ? 'Indisponível sem conexão.' : null;

  return (
    <div className="module-container visao-geral">
      <PageHeader title="Financeiro" />

      {fromCache && <OfflineNotice atualizadoEm={updatedAt} />}

      {/* ══ 1. RESUMO ═════════════════════════════════════════════════════ */}
      <section className="visao-balao" aria-labelledby="visao-resumo">
        <h2 id="visao-resumo" className="visao-balao__titulo">Resumo</h2>
        {carregandoResumo && !resumo ? (
          <Loading />
        ) : !resumo ? (
          <p className="error-message">{erroResumo || 'Resumo financeiro indisponível no momento.'}</p>
        ) : (
          <>
            <div className="summary-grid">
              {CARTOES_DO_ACUMULADO.map(({ key, label, icone, color }) => (
                <CartaoDeResumo key={key} rotulo={label} icone={icone} cor={color}
                                valor={formatCurrency(resumo[key] ?? 0)} />
              ))}
              <CartaoDeResumo
                rotulo={CARTAO_VENCIDO_HOJE.label}
                cor={CARTAO_VENCIDO_HOJE.color}
                Icon={AlertCircle}
                valor={formatCurrency(resumo[CARTAO_VENCIDO_HOJE.key] ?? 0)}
                nota={avisos ? notaDasVencidas(quantasVencidas) : null}
              />
              <CartaoDeResumo
                rotulo={CARTAO_SALDO_ADIANTADO.label}
                icone={CARTAO_SALDO_ADIANTADO.icone}
                cor={CARTAO_SALDO_ADIANTADO.color}
                valor={formatCurrency(resumo[CARTAO_SALDO_ADIANTADO.key] ?? 0)}
              />
            </div>
            {(resumo.saldoAdiantado ?? 0) > 0 && (
              <p className="summary-nota">{notaDoSaldoAdiantado(resumo.saldoAdiantado)}</p>
            )}
          </>
        )}
      </section>

      {/* ══ 2. PARCELAS VENCIDAS ══════════════════════════════════════════ */}
      <section className="visao-balao" aria-labelledby="visao-vencidas">
        <div className="visao-balao__cabecalho">
          <h2 id="visao-vencidas" className="visao-balao__titulo">
            Parcelas vencidas
            {avisos && <span className="visao-balao__total"> ({quantasVencidas})</span>}
          </h2>
          {quantasVencidas > 0 && (
            <Link to={DESTINO_DAS_VENCIDAS} className="ui-btn ui-btn--secondary ui-btn--sm">Ver todas</Link>
          )}
        </div>
        {avisos ? (
          vencidas.length === 0 ? (
            <EmptyState title="Nenhuma parcela vencida." description="Tudo o que venceu até hoje foi recebido." />
          ) : (
            <ul className="datas-lista">
              {vencidas.map((item) => <LinhaDeData key={item.chave} item={item} />)}
            </ul>
          )
        ) : indisponivel ? (
          <p className="visao-balao__vazio">As parcelas vencidas estão indisponíveis sem conexão.</p>
        ) : avisosFalharam ? (
          <p className="error-message">Não foi possível carregar as parcelas vencidas.</p>
        ) : (
          <Loading />
        )}
      </section>

      {/* ══ 3. PRÓXIMOS VENCIMENTOS ═══════════════════════════════════════ */}
      <section className="visao-balao" aria-labelledby="visao-proximos">
        <h2 id="visao-proximos" className="visao-balao__titulo">Próximos vencimentos</h2>
        {carregandoResumo && !resumo ? (
          <Loading />
        ) : !resumo ? (
          <p className="error-message">{erroResumo || 'Não foi possível carregar os próximos vencimentos.'}</p>
        ) : proximos.length === 0 ? (
          <EmptyState title="Nada a vencer." description="Nenhuma parcela em aberto de hoje em diante." />
        ) : (
          <ul className="datas-lista">
            {proximos.map((item) => <LinhaDeData key={item.chave} item={item} />)}
          </ul>
        )}
      </section>

      {/* ══ 4. ATALHOS ════════════════════════════════════════════════════ */}
      <section className="visao-balao" aria-labelledby="visao-atalhos">
        <h2 id="visao-atalhos" className="visao-balao__titulo">Atalhos</h2>
        <ul className="visao-atalhos">
          {ATALHOS.map((atalho) => {
            const total = totais[atalho.chave];
            return (
              <li key={atalho.chave} className="visao-atalho">
                <Link to={atalho.para} className="visao-atalho__link">
                  <Icone nome={atalho.icone} tamanho={20} />
                  <span className="visao-atalho__rotulo">{atalho.rotulo}</span>
                  <span className="visao-atalho__total">
                    {total != null ? `${total.toLocaleString('pt-BR')} ${total === 1 ? 'registro' : 'registros'}` : (indisponivel ?? '—')}
                  </span>
                </Link>
                {online ? (
                  <Link to={atalho.novo.para} className="ui-btn ui-btn--primary ui-btn--sm">{atalho.novo.rotulo}</Link>
                ) : (
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--sm"
                    aria-disabled="true"
                    aria-describedby="visao-atalhos-motivo"
                    onClick={(e) => e.preventDefault()}
                  >
                    {atalho.novo.rotulo}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {!online && <p id="visao-atalhos-motivo" className="visao-atalhos__motivo">{MENSAGEM_ESCRITA_OFFLINE}</p>}
      </section>
    </div>
  );
}

export default FinanceiroPage;
