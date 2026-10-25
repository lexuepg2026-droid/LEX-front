import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import portalService from '../../api/portalService';
import PortalDocumentList from '../../components/portal/PortalDocumentList';
import PortalConfirmation from '../../components/portal/PortalConfirmation';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  EXPLICACAO_TRANSITO_EM_JULGADO,
  explicacaoFase,
  explicacaoPapel,
  explicacaoStatus,
  formatarDataCivil,
  formatarDataHora,
  rotuloFase,
  rotuloPapel,
  rotuloStatus,
} from '../../utils/portalLabels';
// Ver a nota em `PortalLoginPage.jsx`: cada página do portal importa a folha,
// porque o estilo que chega pelo layout não é alcançável por análise estática.
import '../../components/portal/Portal.css';

// ═══════════════════════════════════════════════════════════════════════════
// A TELA DO CLIENTE — processo, documentos e, no fim, a confirmação
//
// Uma página só, nesta ordem, e a ordem é a decisão: o cliente lê o processo,
// abre os documentos, e só então encontra o botão de confirmar. Ver
// `PortalConfirmation.jsx`.
//
// Tudo que aparece aqui vem da projeção allowlist do backend
// (`portalProjection.js`), que monta a resposta campo a campo. Não há
// `observacoes`, não há valor financeiro, não há outros participantes e não há
// código de acesso — não porque a tela os esconde, mas porque não chegam.
// ═══════════════════════════════════════════════════════════════════════════

function PortalProcessPage() {
  const [processo, setProcesso] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [acesso, setAcesso] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  // Fase 2.5 (DEC-096): o processo vem da URL. Quantos processos a pessoa tem
  // decide se há "Voltar" para a lista — com um só, a lista nem aparece.
  const { processoId } = useParams();
  const [totalDeProcessos, setTotalDeProcessos] = useState(0);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro('');

    Promise.all([
      portalService.obterProcesso(processoId),
      portalService.listarDocumentos(processoId),
      portalService.listarProcessos(),
    ])
      .then(([resProcesso, resDocumentos, resLista]) => {
        if (!ativo) return;
        setProcesso(resProcesso.data?.processo ?? null);
        setCliente(resProcesso.data?.cliente ?? null);
        setAcesso(resProcesso.data?.acesso ?? null);
        setDocumentos(resDocumentos.data?.data ?? []);
        setTotalDeProcessos(resLista.data?.total ?? 0);
      })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Não foi possível carregar o processo.'));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [processoId]);

  if (carregando) {
    return (
      <div className="portal-carregando" role="status" aria-live="polite">
        Carregando o seu processo…
      </div>
    );
  }

  // O servidor responde 404 tanto para "não existe" quanto para "não está
  // liberado para você" — inclusive quando a advogada desligou o processo no
  // meio da sessão. A tela não distingue (não teria como), e oferece a lista.
  if (erro) {
    return (
      <>
        <p className="portal-erro" role="alert">
          {erro}
        </p>
        <Link to="/portal/processos" className="portal-voltar">
          <ArrowLeft size={18} aria-hidden="true" />
          Ver os seus processos
        </Link>
      </>
    );
  }

  if (!processo) return null;

  return (
    <>
      {totalDeProcessos > 1 && (
        <Link to="/portal/processos" className="portal-voltar">
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar aos seus processos
        </Link>
      )}

      <section className="portal-cartao">
        {/* O nome existe para o cliente conferir que entrou na conta certa —
            não é ficha cadastral. A projeção do backend manda só isto. */}
        {cliente?.nome && (
          <p className="portal-texto">
            Olá, <strong>{cliente.nome}</strong>.
          </p>
        )}

        <h1 className="portal-titulo">{processo.titulo ?? 'Seu processo'}</h1>

        {processo.descricao && <p className="portal-texto">{processo.descricao}</p>}

        <dl className="portal-dados" style={{ marginTop: 'var(--space-5)' }}>
          <div className="portal-dado">
            <dt className="portal-dado__rotulo">Número do processo</dt>
            <dd className="portal-dado__valor">
              {processo.numeroProcesso ?? 'Ainda não distribuído'}
            </dd>
          </div>

          <div className="portal-dado">
            <dt className="portal-dado__rotulo">Situação</dt>
            <dd className="portal-dado__valor">
              {rotuloStatus(processo.status)}
              {/* A tradução do enum não basta: "Suspenso" também é jargão.
                  A explicação em uma linha é o que o cliente de fato lê. */}
              {explicacaoStatus(processo.status) && (
                <span className="portal-ajuda"> {explicacaoStatus(processo.status)}</span>
              )}
            </dd>
          </div>

          {/* Fase (DEC-054) é onde o processo ESTÁ; "Situação" acima é o eixo
              administrativo. Sem a fase o cliente sabia que o processo andava,
              mas não em que ponto. */}
          {processo.fase && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Fase do processo</dt>
              <dd className="portal-dado__valor">
                {rotuloFase(processo.fase)}
                {explicacaoFase(processo.fase) && (
                  <span className="portal-ajuda"> {explicacaoFase(processo.fase)}</span>
                )}
              </dd>
            </div>
          )}

          {/* Independe da fase e do "Situação": a advogada registra cada um à
              mão, e um processo transitado pode ainda constar como em curso. */}
          {processo.transitoEmJulgadoEm && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Trânsito em julgado</dt>
              <dd className="portal-dado__valor">
                {formatarDataCivil(processo.transitoEmJulgadoEm)}
                <span className="portal-ajuda"> {EXPLICACAO_TRANSITO_EM_JULGADO}</span>
              </dd>
            </div>
          )}

          <div className="portal-dado">
            <dt className="portal-dado__rotulo">A sua posição no processo</dt>
            <dd className="portal-dado__valor">
              {rotuloPapel(processo.meuPapel)}
              {explicacaoPapel(processo.meuPapel) && (
                <span className="portal-ajuda"> {explicacaoPapel(processo.meuPapel)}</span>
              )}
            </dd>
          </div>

          {processo.tipoAcao && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Tipo de ação</dt>
              <dd className="portal-dado__valor">{processo.tipoAcao}</dd>
            </div>
          )}

          {processo.area && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Área</dt>
              <dd className="portal-dado__valor">{processo.area}</dd>
            </div>
          )}

          {processo.orgao && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Órgão</dt>
              <dd className="portal-dado__valor">{processo.orgao}</dd>
            </div>
          )}

          {processo.vara && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Vara</dt>
              <dd className="portal-dado__valor">{processo.vara}</dd>
            </div>
          )}

          {processo.comarca && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Comarca</dt>
              <dd className="portal-dado__valor">{processo.comarca}</dd>
            </div>
          )}

          {processo.dataDistribuicao && (
            <div className="portal-dado">
              <dt className="portal-dado__rotulo">Distribuído em</dt>
              <dd className="portal-dado__valor">{formatarDataCivil(processo.dataDistribuicao)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="portal-cartao">
        <h2 className="portal-secao-titulo">Documentos</h2>
        <PortalDocumentList processoId={processoId} documentos={documentos} />
      </section>

      {/* O bloco de confirmação vem DEPOIS do conteúdo, sempre. Ver
          `PortalConfirmation.jsx` para o motivo probatório. */}
      <PortalConfirmation processoId={processoId} />

      {acesso?.primeiroAcesso && (
        <p className="portal-ajuda" style={{ marginTop: 'var(--space-5)' }}>
          Seu primeiro acesso a esta página foi em {formatarDataHora(acesso.primeiroAcesso)}.
        </p>
      )}
    </>
  );
}

export default PortalProcessPage;
