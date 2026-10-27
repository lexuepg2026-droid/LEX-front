import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import clientService from '../../api/clientService';
import { getApiErrorMessage } from '../../utils/apiError';
import { blockReason } from '../../offline/offlineMessages';
import StatusBadge from '../ui/StatusBadge';
import ActionMenu from '../ui/ActionMenu';
import Loading from '../common/Loading';
import useLinhaClicavel from '../financeiro/useLinhaClicavel';
import AccessDelivery from '../processes/AccessDelivery';
import LiberacaoPortal from '../processes/LiberacaoPortal';
import AcessoPortalResumo from './AcessoPortalResumo';
import RevogacaoPortal from './RevogacaoPortal';
import {
  destinoDoProcesso,
  rotuloDoProcesso,
  situacaoDoProcessoNoPortal,
} from '../../pages/clients/detalheCliente.js';
import { labelDe, PAPEL_PROCESSO_OPTIONS } from '../../utils/enums';
import '../../pages/processes/ProcessPage.css';
import '../../pages/processes/ProcessDetailPage.css';
import '../../pages/clients/ClientPage.css';

// Data e hora no fuso do escritório, como no detalhe do processo: o último
// acesso é carimbo que a advogada pode precisar citar.
const dataHoraBR = (iso) =>
  iso
    ? new Date(iso).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

// ═══════════════════════════════════════════════════════════════════════════
// A ABA "PORTAL" DO CLIENTE — Fase 3.5 (DEC-123), a pendência da 2.5
//
// O lado da advogada do portal por pessoa (DEC-089 a DEC-097), num lugar só:
//   - o código pessoal e a situação da senha (`AcessoPortalResumo`), pela
//     rota dedicada `GET /clients/:id/acesso-portal` — nunca pela listagem;
//   - os processos do cliente, cada um com a situação no portal, o
//     interruptor "Liberado no portal" (DEC-097/111) e o último acesso;
//   - a entrega do acesso (`AccessDelivery`), por processo, no ⋮ da linha;
//   - a revogação (`RevogacaoPortal`), a mesma do formulário;
//   - sem senha, "Sem acesso ao portal", com o caminho para definir uma.
//
// As linhas são as dos participantes do detalhe do processo (DEC-111), lidas
// pelo outro lado do vínculo: as mesmas classes, o mesmo interruptor.
//
// ── Sem espelho ──────────────────────────────────────────────────────────
// É metade de uma credencial, e não fica guardada no navegador (DEC-097).
// Sem sinal, a aba diz que não sabe — nunca "sem acesso" de quem tem.
// ═══════════════════════════════════════════════════════════════════════════
function ClientPortalTab({ clienteId, nomeCliente, online }) {
  const clicarNaLinha = useLinhaClicavel();
  const [acesso, setAcesso] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [entregaAberta, setEntregaAberta] = useState(null);

  const carregar = useCallback(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');
    clientService
      .getAcessoPortal(clienteId)
      .then((res) => { if (ativo) setAcesso(res.data); })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Não foi possível consultar o acesso ao portal.'));
      })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [clienteId]);

  useEffect(() => {
    if (!online) {
      setCarregando(false);
      return undefined;
    }
    return carregar();
  }, [carregar, online]);

  // O servidor já confirmou: a linha e o "N de M" acompanham sem recarregar.
  const marcarLiberacao = (processoId, valor) =>
    setAcesso((a) => {
      if (!a) return a;
      const processos = a.processos.map((p) =>
        String(p.processoId) === String(processoId) ? { ...p, liberadoNoPortal: valor } : p
      );
      const delta = valor ? 1 : -1;
      return { ...a, processos, processosLiberados: a.processosLiberados + delta };
    });

  const motivoSemSinal = blockReason(null, { online });

  return (
    <section className="processo-balao" aria-labelledby="titulo-portal-do-cliente">
      <h2 id="titulo-portal-do-cliente" className="processo-balao__titulo">Acesso ao portal</h2>

      {!acesso && !online && (
        <p className="processo-balao__vazio">Acesso ao portal indisponível sem conexão.</p>
      )}
      {erro && <p className="error-message">{erro}</p>}
      {carregando && !acesso && online && <Loading />}

      {acesso && (
        <>
          <AcessoPortalResumo clienteId={clienteId} acesso={acesso} />

          {acesso.temSenhaPortal && (
            <RevogacaoPortal clienteId={clienteId} online={online} onRevogado={carregar} />
          )}

          <h3 className="cliente-aba__subtitulo">
            Processos deste cliente <span className="processo-balao__total">({acesso.processos.length})</span>
          </h3>

          {acesso.processos.length === 0 ? (
            <p className="processo-balao__vazio">Este cliente não participa de nenhum processo.</p>
          ) : (
            <ul className="participantes-detalhe">
              {acesso.processos.map((item) => {
                const processoId = String(item.processoId);
                const situacao = situacaoDoProcessoNoPortal(item, { temSenhaPortal: acesso.temSenhaPortal });
                const destino = destinoDoProcesso(processoId);
                const rotulo = rotuloDoProcesso(item);
                const ultimoAcesso = dataHoraBR(item.ultimoAcessoPortal);
                return (
                  <li key={processoId} className="participante-linha">
                    <div className="participante-linha__dados" onClick={clicarNaLinha(destino)}>
                      <div className="participante-linha__quem">
                        <Link to={destino} className="link-interno participante-linha__nome">{rotulo}</Link>
                        {item.principal && <span className="participante-linha__principal">Principal</span>}
                      </div>

                      <span className="participante-linha__papel">
                        {labelDe(PAPEL_PROCESSO_OPTIONS, item.papel)}
                      </span>

                      <div className="participante-linha__portal">
                        {situacao.status ? (
                          <StatusBadge status={situacao.status} />
                        ) : (
                          <span className="participante-linha__nota">{situacao.texto}</span>
                        )}
                        <span className="participante-linha__nota">
                          {ultimoAcesso ? `último acesso: ${ultimoAcesso}` : 'nunca acessou este processo'}
                        </span>
                      </div>

                      {/* O interruptor só existe onde a liberação alcança:
                          cliente com senha, vínculo e processo ativos. */}
                      <div className="participante-linha__interruptor">
                        {situacao.interruptor && (
                          <LiberacaoPortal
                            processoId={processoId}
                            clienteId={clienteId}
                            nomeCliente={nomeCliente}
                            liberado={item.liberadoNoPortal === true}
                            online={online}
                            onAlterado={(valor) => marcarLiberacao(processoId, valor)}
                          />
                        )}
                      </div>

                      <div className="participante-linha__acoes">
                        <ActionMenu
                          rotulo={`Ações do processo ${rotulo}`}
                          itens={[
                            { rotulo: 'Abrir o processo', to: destino },
                            ...(situacao.interruptor
                              ? [{
                                  rotulo: entregaAberta === processoId ? 'Fechar entrega' : 'Entregar acesso',
                                  motivo: motivoSemSinal,
                                  onSelecionar: () => setEntregaAberta(entregaAberta === processoId ? null : processoId),
                                }]
                              : []),
                          ]}
                        />
                      </div>
                    </div>

                    {entregaAberta === processoId && (
                      <AccessDelivery
                        processoId={processoId}
                        clienteId={clienteId}
                        nomeCliente={nomeCliente}
                        nomeProcesso={item.titulo}
                        online={online}
                        onLiberado={() => marcarLiberacao(processoId, true)}
                        onFechar={() => setEntregaAberta(null)}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export default ClientPortalTab;
