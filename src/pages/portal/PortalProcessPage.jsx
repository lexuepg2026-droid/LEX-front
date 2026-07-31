import React, { useEffect, useState } from 'react';
import portalService from '../../api/portalService';
import PortalDocumentList from '../../components/portal/PortalDocumentList';
import PortalConfirmation from '../../components/portal/PortalConfirmation';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  explicacaoPapel,
  explicacaoStatus,
  formatarData,
  formatarDataHora,
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

  useEffect(() => {
    let ativo = true;

    Promise.all([portalService.obterProcesso(), portalService.listarDocumentos()])
      .then(([resProcesso, resDocumentos]) => {
        if (!ativo) return;
        setProcesso(resProcesso.data?.processo ?? null);
        setCliente(resProcesso.data?.cliente ?? null);
        setAcesso(resProcesso.data?.acesso ?? null);
        setDocumentos(resDocumentos.data?.data ?? []);
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
  }, []);

  if (carregando) {
    return (
      <div className="portal-carregando" role="status" aria-live="polite">
        Carregando o seu processo…
      </div>
    );
  }

  if (erro) {
    return (
      <p className="portal-erro" role="alert">
        {erro}
      </p>
    );
  }

  if (!processo) return null;

  return (
    <>
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
              <dd className="portal-dado__valor">{formatarData(processo.dataDistribuicao)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="portal-cartao">
        <h2 className="portal-secao-titulo">Documentos</h2>
        <PortalDocumentList documentos={documentos} />
      </section>

      {/* O bloco de confirmação vem DEPOIS do conteúdo, sempre. Ver
          `PortalConfirmation.jsx` para o motivo probatório. */}
      <PortalConfirmation />

      {acesso?.primeiroAcesso && (
        <p className="portal-ajuda" style={{ marginTop: 'var(--space-5)' }}>
          Seu primeiro acesso a esta página foi em {formatarDataHora(acesso.primeiroAcesso)}.
        </p>
      )}
    </>
  );
}

export default PortalProcessPage;
