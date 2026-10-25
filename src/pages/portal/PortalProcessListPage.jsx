import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import portalService from '../../api/portalService';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { rotuloFase, rotuloPapel, formatarDataCivil } from '../../utils/portalLabels';
import '../../components/portal/Portal.css';

// ═══════════════════════════════════════════════════════════════════════════
// "SEUS PROCESSOS" — a tela entre o login e o processo (Fase 2.5, DEC-096)
//
// Desde a 2.5 o login é da PESSOA (DEC-089), e um código abre todos os
// processos que a advogada liberou para ela. Esta tela é a lista deles, um
// cartão por processo, com o que a pessoa precisa para escolher: título,
// número, fase e os dois indicadores — documento novo e confirmação pendente.
//
//   - com UM processo só, ela segue direto para ele: uma tela de escolha com
//     uma opção é um clique a mais para ninguém;
//   - com NENHUM, a frase diz o que fazer — não é erro, é o estado de quem
//     ainda não teve processo liberado.
//
// Quem decide o que entra na lista é o servidor (vínculo ativo e liberado,
// processo ativo). A tela não filtra nada.
// ═══════════════════════════════════════════════════════════════════════════

const novidades = (p) => {
  if (p.documentosNovos === 1) return '1 documento novo';
  if (p.documentosNovos > 1) return `${p.documentosNovos} documentos novos`;
  return null;
};

function PortalProcessListPage() {
  const { cliente } = usePortalAuth();
  const [processos, setProcessos] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    portalService
      .listarProcessos()
      .then((res) => {
        if (ativo) setProcessos(res.data?.data ?? []);
      })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Não foi possível carregar os seus processos.'));
      });
    return () => {
      ativo = false;
    };
  }, []);

  if (erro) {
    return (
      <p className="portal-erro" role="alert">
        {erro}
      </p>
    );
  }

  if (processos === null) {
    return (
      <div className="portal-carregando" role="status" aria-live="polite">
        Carregando os seus processos…
      </div>
    );
  }

  // Um processo só: direto para ele. `replace`, para o "voltar" do navegador
  // não cair numa lista que redireciona de novo.
  if (processos.length === 1) {
    return <Navigate to={`/portal/processos/${processos[0].id}`} replace />;
  }

  return (
    <>
      {/* O nome existe para a pessoa conferir que entrou na conta certa. */}
      {cliente?.nome && (
        <h1 className="portal-titulo">Olá, {cliente.nome}</h1>
      )}

      {processos.length === 0 ? (
        <div className="portal-cartao">
          <div className="portal-vazio">
            <p className="portal-vazio__texto">
              Nenhum processo liberado para você no momento. Fale com seu advogado.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="portal-texto" style={{ marginBottom: 'var(--space-4)' }}>
            Estes são os processos que a advogada liberou para você. Escolha um para ver
            os detalhes e os documentos.
          </p>
          <ul className="portal-processos">
            {processos.map((p) => {
              const novos = novidades(p);
              return (
                <li key={p.id}>
                  <Link to={`/portal/processos/${p.id}`} className="portal-processo">
                    <h2 className="portal-processo__titulo">{p.titulo ?? 'Processo'}</h2>
                    <p className="portal-processo__meta">
                      {p.numeroProcesso ?? 'Ainda não distribuído'}
                      {p.fase ? ` · ${rotuloFase(p.fase)}` : ''}
                      {p.meuPapel ? ` · ${rotuloPapel(p.meuPapel)}` : ''}
                    </p>
                    {p.transitoEmJulgadoEm && (
                      <p className="portal-processo__meta">
                        Trânsito em julgado em {formatarDataCivil(p.transitoEmJulgadoEm)}
                      </p>
                    )}
                    {(novos || p.confirmacaoPendente) && (
                      <div className="portal-processo__indicadores">
                        {novos && <span className="portal-selo portal-selo--alerta">{novos}</span>}
                        {p.confirmacaoPendente && (
                          <span className="portal-selo portal-selo--neutro">Confirmação de leitura pendente</span>
                        )}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

export default PortalProcessListPage;
