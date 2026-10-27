import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import processService from '../../api/processService';
import { getApiErrorMessage } from '../../utils/apiError';
import { rotuloDaFase } from '../../utils/enums';
import { rotuloDoStatus, tomDoStatus } from '../../utils/statusVisual';
import { classeDaBolinha } from '../processes/detalheProcesso.js';
import useLinhaClicavel from '../financeiro/useLinhaClicavel';
import Loading from '../common/Loading';
import Paginador from '../ui/Paginador';
import {
  destinoDoProcesso,
  listaDeProcessosDoCliente,
  vinculoDoCliente,
} from '../../pages/clients/detalheCliente.js';
import '../../styles/modules.css';
import '../financeiro/CabecalhoDeLista.css';
import '../../pages/processes/ProcessPage.css';
import '../../pages/clients/ClientPage.css';

const POR_PAGINA = 20;

// ═══════════════════════════════════════════════════════════════════════════
// A ABA "PROCESSOS" DO CLIENTE — Fase 3.5 (DEC-123), apontamento 3 da banca
//
// "A tela do cliente mostra os processos dele": `GET /processes?clienteId=`
// (DEC-119), vínculo ativo, como principal ou não. Uma tabela compacta — Nº,
// título, papel (com o selo "Principal"), fase e status (bolinha e palavra, os
// do detalhe do processo) —, cada linha levando ao detalhe do processo, e o
// link para a lista de processos com o mesmo recorte, onde há os filtros.
//
// ── Sem espelho, de propósito ────────────────────────────────────────────
// O detalhe do cliente já serve do espelho com o aviso de idade dele
// (DEC-109: um aviso por tela). Um segundo espelho aqui pediria um segundo
// aviso, ou serviria dado velho calado. Sem sinal, a aba DIZ que não sabe —
// "indisponível sem conexão" (DEC-111) — e nunca "nenhum processo".
// ═══════════════════════════════════════════════════════════════════════════
function ClientProcessesTab({ clienteId, online }) {
  const clicarNaLinha = useLinhaClicavel();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState({ carregando: true, dados: null, erro: '' });

  useEffect(() => {
    let ativo = true;
    // Sem sinal, nada a pedir: o que já chegou nesta visita fica (é desta
    // sessão, não do espelho); o que não chegou, a tela diz que não sabe.
    if (!online) {
      setEstado((e) => ({ ...e, carregando: false }));
      return () => { ativo = false; };
    }
    setEstado((e) => ({ ...e, carregando: true, erro: '' }));
    processService
      .listProcesses({ clienteId, page, limit: POR_PAGINA })
      .then((res) => { if (ativo) setEstado({ carregando: false, dados: res.data, erro: '' }); })
      .catch((err) => {
        if (ativo) setEstado({ carregando: false, dados: null, erro: getApiErrorMessage(err, 'Não foi possível carregar os processos deste cliente.') });
      });
    return () => { ativo = false; };
  }, [clienteId, page, online]);

  const processos = estado.dados?.data ?? [];
  const total = typeof estado.dados?.total === 'number' ? estado.dados.total : 0;

  return (
    <section className="lista-balao" aria-labelledby="titulo-processos-do-cliente">
      <div className="cliente-aba__topo">
        <h2 id="titulo-processos-do-cliente" className="processo-balao__titulo">
          Processos{estado.dados && <span className="processo-balao__total"> ({total})</span>}
        </h2>
        <Link to={listaDeProcessosDoCliente(clienteId)} className="link-interno">
          Ver na lista de processos
        </Link>
      </div>

      {!estado.dados && !online && (
        <p className="processo-balao__vazio">Processos deste cliente indisponíveis sem conexão.</p>
      )}
      {estado.erro && <p className="error-message">{estado.erro}</p>}
      {estado.carregando && !estado.dados && online && <Loading />}

      {estado.dados && processos.length === 0 && (
        <p className="processo-balao__vazio">Este cliente não participa de nenhum processo ativo.</p>
      )}

      {processos.length > 0 && (
        <div className="table-wrapper" aria-busy={estado.carregando || undefined}>
          <table className="data-table data-table--fixed">
            <colgroup>
              <col className="col-lg" />
              <col className="col-lg" />
              <col className="col-md" />
              <col className="col-md" />
              <col className="col-sm" />
            </colgroup>
            <thead>
              <tr>
                <th>Nº Processo</th>
                <th>Título</th>
                <th>Papel</th>
                <th>Fase</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {processos.map((p) => {
                const destino = destinoDoProcesso(p._id);
                const vinculo = vinculoDoCliente(p, clienteId);
                return (
                  <tr key={p._id} className="linha-clicavel" onClick={clicarNaLinha(destino)}>
                    <td className="cell-truncate" title={p.numeroProcesso || undefined}>{p.numeroProcesso || '—'}</td>
                    <td className="cell-truncate" title={p.titulo}>
                      {/* O link do título é o alvo de Tab da linha (DEC-102). */}
                      <Link to={destino} className="link-interno">{p.titulo}</Link>
                    </td>
                    <td className="cell-truncate">
                      {vinculo ? vinculo.papel : '—'}
                      {vinculo?.principal && <span className="participante-linha__principal">Principal</span>}
                    </td>
                    <td className="cell-truncate">{rotuloDaFase(p.fase)}</td>
                    <td>
                      <span className="processo-status">
                        <span
                          className={`processo-status__bolinha ${classeDaBolinha(tomDoStatus(p.status))}`}
                          aria-hidden="true"
                        />
                        {rotuloDoStatus(p.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {estado.dados && total > POR_PAGINA && (
        <Paginador page={page} limit={POR_PAGINA} total={total} rotulo="processo" onMudarPagina={setPage} />
      )}
    </section>
  );
}

export default ClientProcessesTab;
