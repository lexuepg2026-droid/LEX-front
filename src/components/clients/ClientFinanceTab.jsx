import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import installmentService from '../../api/installmentService';
import paymentService from '../../api/paymentService';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { rotuloCurtoDoHonorario } from '../../utils/feeLabel';
import { rotuloDoProcessoFiltrado } from '../../utils/processoFiltrado.js';
import { FORMA_PAGAMENTO_OPTIONS, labelDe } from '../../utils/enums';
import { rotuloDaParcela } from '../financeiro/installmentLabel';
import useLinhaClicavel from '../financeiro/useLinhaClicavel';
import StatusBadge from '../ui/StatusBadge';
import Loading from '../common/Loading';
import Paginador from '../ui/Paginador';
import {
  listaDeParcelasDoCliente,
  listaDePagamentosDoCliente,
} from '../../pages/clients/detalheCliente.js';
import '../../styles/modules.css';
import '../financeiro/CabecalhoDeLista.css';
import '../../pages/processes/ProcessPage.css';
import '../../pages/clients/ClientPage.css';

const POR_PAGINA = 20;

// ═══════════════════════════════════════════════════════════════════════════
// A ABA "FINANCEIRO" DO CLIENTE — Fase 4a2 (DEC-167)
//
// Revê a DEC-123, que tinha deixado o financeiro fora do detalhe do cliente.
// Duas listas compactas, como a aba "Processos": as PARCELAS e os PAGAMENTOS
// dos honorários dos processos em que o cliente tem vínculo ativo
// (`?clienteId=` em `GET /installments` e `GET /payments`, DEC-166 do back),
// cada uma com a coluna do processo e o link para a lista completa filtrada —
// lá estão a busca, os filtros e o chip "só este cliente".
//
// ── Sem espelho, como as outras abas ─────────────────────────────────────
// O detalhe já serve o cliente do espelho com o aviso de idade dele (DEC-109).
// Sem sinal, cada lista DIZ que não sabe — "indisponível sem conexão" —, e
// nunca "nenhuma parcela".
// ═══════════════════════════════════════════════════════════════════════════

// A leitura de uma das duas listas, página a página. O que já chegou nesta
// visita fica quando o sinal cai (é desta sessão, não do espelho).
function useListaDoCliente(buscar, clienteId, online, erroPadrao) {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState({ carregando: true, dados: null, erro: '' });

  useEffect(() => {
    let ativo = true;
    if (!online) {
      setEstado((e) => ({ ...e, carregando: false }));
      return () => { ativo = false; };
    }
    setEstado((e) => ({ ...e, carregando: true, erro: '' }));
    buscar({ clienteId, page, limit: POR_PAGINA })
      .then((res) => { if (ativo) setEstado({ carregando: false, dados: res.data, erro: '' }); })
      .catch((err) => {
        if (ativo) setEstado({ carregando: false, dados: null, erro: getApiErrorMessage(err, erroPadrao) });
      });
    return () => { ativo = false; };
  }, [buscar, clienteId, page, online, erroPadrao]);

  const itens = estado.dados?.data ?? [];
  const total = typeof estado.dados?.total === 'number' ? estado.dados.total : 0;
  return { ...estado, itens, total, page, setPage };
}

const listarParcelas = (consulta) => installmentService.listInstallments(consulta);
const listarPagamentos = (consulta) => paymentService.listPayments(consulta);

function ClientFinanceTab({ clienteId, online }) {
  const clicarNaLinha = useLinhaClicavel();
  const parcelas = useListaDoCliente(listarParcelas, clienteId, online, 'Não foi possível carregar as parcelas deste cliente.');
  const pagamentos = useListaDoCliente(listarPagamentos, clienteId, online, 'Não foi possível carregar os pagamentos deste cliente.');

  // A linha da parcela leva à edição dela, como na lista; a reparcelada leva
  // ao honorário. Sem sinal a edição é recusada, e a linha não abre.
  const destinoDaParcela = (inst) => {
    if (inst.status === 'cancelado') return inst.feeId?._id ? `/dashboard/honorarios/${inst.feeId._id}` : null;
    return online ? `/dashboard/parcelas/editar/${inst._id}` : null;
  };

  return (
    <>
      <section className="lista-balao" aria-labelledby="titulo-parcelas-do-cliente">
        <div className="cliente-aba__topo">
          <h2 id="titulo-parcelas-do-cliente" className="processo-balao__titulo">
            Parcelas{parcelas.dados && <span className="processo-balao__total"> ({parcelas.total})</span>}
          </h2>
          <Link to={listaDeParcelasDoCliente(clienteId)} className="link-interno">
            Ver na lista de parcelas
          </Link>
        </div>

        {!parcelas.dados && !online && (
          <p className="processo-balao__vazio">As parcelas deste cliente estão indisponíveis sem conexão.</p>
        )}
        {parcelas.erro && <p className="error-message">{parcelas.erro}</p>}
        {parcelas.carregando && !parcelas.dados && online && <Loading />}
        {parcelas.dados && parcelas.itens.length === 0 && (
          <p className="processo-balao__vazio">Nenhuma parcela nos processos deste cliente.</p>
        )}

        {parcelas.itens.length > 0 && (
          <div className="table-wrapper" aria-busy={parcelas.carregando || undefined}>
            <table className="data-table data-table--fixed">
              <colgroup>
                <col className="col-lg" />
                <col className="col-md" />
                <col className="col-parcela" />
                <col className="col-money" />
                <col className="col-money" />
                <col className="col-data" />
                <col className="col-status" />
              </colgroup>
              <thead>
                <tr>
                  <th>Honorário</th>
                  <th>Processo</th>
                  <th>Parcela</th>
                  <th className="cell-num">Valor</th>
                  <th className="cell-num">Em aberto</th>
                  <th>Vencimento</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.itens.map((inst) => {
                  const destino = destinoDaParcela(inst);
                  const processo = rotuloDoProcessoFiltrado(inst.processo);
                  const rotulo = rotuloDaParcela({
                    numeroParcela: inst.numeroParcela,
                    totalParcelas: inst.totalParcelas ?? null,
                    totalNoPlanoVigente: inst.totalNoPlano ?? null,
                  });
                  return (
                    <tr key={inst._id} className={destino ? 'linha-clicavel' : undefined} onClick={clicarNaLinha(destino)}>
                      <td className="cell-truncate" title={inst.feeId?.descricao || undefined}>
                        {inst.feeId?._id ? (
                          <Link to={`/dashboard/honorarios/${inst.feeId._id}`} className="link-interno">
                            {rotuloCurtoDoHonorario(inst.feeId.descricao)}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="cell-truncate" title={processo ?? undefined}>{processo ?? '—'}</td>
                      <td className="cell-num">{rotulo}</td>
                      <td className="cell-num">{formatCurrency(inst.valor)}</td>
                      <td className="cell-num">{formatCurrency(Math.max(0, Number(inst.valor || 0) - Number(inst.valorPago || 0)))}</td>
                      <td>{formatDate(inst.dataVencimento)}</td>
                      <td><StatusBadge status={inst.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {parcelas.dados && parcelas.total > POR_PAGINA && (
          <Paginador page={parcelas.page} limit={POR_PAGINA} total={parcelas.total} rotulo="parcela" onMudarPagina={parcelas.setPage} />
        )}
      </section>

      <section className="lista-balao" aria-labelledby="titulo-pagamentos-do-cliente">
        <div className="cliente-aba__topo">
          <h2 id="titulo-pagamentos-do-cliente" className="processo-balao__titulo">
            Pagamentos{pagamentos.dados && <span className="processo-balao__total"> ({pagamentos.total})</span>}
          </h2>
          <Link to={listaDePagamentosDoCliente(clienteId)} className="link-interno">
            Ver na lista de pagamentos
          </Link>
        </div>

        {!pagamentos.dados && !online && (
          <p className="processo-balao__vazio">Os pagamentos deste cliente estão indisponíveis sem conexão.</p>
        )}
        {pagamentos.erro && <p className="error-message">{pagamentos.erro}</p>}
        {pagamentos.carregando && !pagamentos.dados && online && <Loading />}
        {pagamentos.dados && pagamentos.itens.length === 0 && (
          <p className="processo-balao__vazio">Nenhum pagamento nos processos deste cliente.</p>
        )}

        {pagamentos.itens.length > 0 && (
          <div className="table-wrapper" aria-busy={pagamentos.carregando || undefined}>
            <table className="data-table data-table--fixed">
              <colgroup>
                <col className="col-lg" />
                <col className="col-md" />
                <col className="col-money" />
                <col className="col-money" />
                <col className="col-data" />
                <col className="col-sm" />
              </colgroup>
              <thead>
                <tr>
                  <th>Honorário</th>
                  <th>Processo</th>
                  <th className="cell-num">Valor</th>
                  <th className="cell-num">Líquido</th>
                  <th>Data</th>
                  <th>Forma</th>
                </tr>
              </thead>
              <tbody>
                {pagamentos.itens.map((p) => {
                  const destino = online ? `/dashboard/pagamentos/editar/${p._id}` : null;
                  const processo = rotuloDoProcessoFiltrado(p.honorarioId?.processoId);
                  return (
                    <tr key={p._id} className={destino ? 'linha-clicavel' : undefined} onClick={clicarNaLinha(destino)}>
                      <td className="cell-truncate" title={p.honorarioId?.descricao ?? undefined}>
                        {p.honorarioId?._id ? (
                          <Link to={`/dashboard/honorarios/${p.honorarioId._id}`} className="link-interno">
                            {rotuloCurtoDoHonorario(p.honorarioId.descricao)}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="cell-truncate" title={processo ?? undefined}>{processo ?? '—'}</td>
                      <td className="cell-num">{formatCurrency(p.valor)}</td>
                      <td className="cell-num">{formatCurrency(p.valorLiquido ?? p.valor)}</td>
                      <td>{formatDate(p.data)}</td>
                      <td className="cell-truncate">{labelDe(FORMA_PAGAMENTO_OPTIONS, p.formaPagamento)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagamentos.dados && pagamentos.total > POR_PAGINA && (
          <Paginador page={pagamentos.page} limit={POR_PAGINA} total={pagamentos.total} rotulo="pagamento" onMudarPagina={pagamentos.setPage} />
        )}
      </section>
    </>
  );
}

export default ClientFinanceTab;
