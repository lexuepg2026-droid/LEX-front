import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import portalService from '../../api/portalService';
import { codigoDoErro, ERRO_PORTAL } from '../../api/portalAxios';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatarDataHora } from '../../utils/portalLabels';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIRMAÇÃO DE VISUALIZAÇÃO
//
// ── Onde este bloco fica, e por quê ───────────────────────────────────────
// No FIM da página, depois do processo e dos documentos. Nunca em modal
// bloqueante.
//
// Um modal que exigisse confirmar para ver inverteria o sentido do recibo: o
// cliente estaria declarando que leu algo que a interface ainda não lhe
// mostrou. O registro continuaria sendo gravado, e continuaria dizendo
// "declaro que tomei ciência" — só que sobre nada. Ler primeiro e confirmar
// depois é o que faz o registro valer.
//
// ── O texto é exibido literalmente ────────────────────────────────────────
// Vem de `GET /portal/confirmacoes/texto` e é renderizado como veio: sem
// reescrever, sem resumir, sem truncar. O backend copia a MESMA constante para
// dentro de cada registro gravado. Se a tela mostrasse outra coisa, o cliente
// concordaria com um texto e o recibo afirmaria outro — e foi exatamente para
// impedir isso que a Fase 3.1 tirou o texto do corpo da requisição.
//
// ── Confirmar de novo não apaga nada ──────────────────────────────────────
// Confirmações repetidas são permitidas e TODAS registradas. Confirmar hoje, a
// advogada liberar um documento amanhã, e o cliente confirmar de novo são dois
// fatos distintos sobre conteúdos distintos. A tela diz isso, porque a
// suposição natural de quem clica duas vezes é que a segunda substitui a
// primeira.
// ═══════════════════════════════════════════════════════════════════════════

function PortalConfirmation() {
  const [texto, setTexto] = useState('');
  const [confirmacoes, setConfirmacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [bloqueadaPorSenha, setBloqueadaPorSenha] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let ativo = true;

    Promise.all([portalService.textoConfirmacao(), portalService.listarConfirmacoes()])
      .then(([resTexto, resHistorico]) => {
        if (!ativo) return;
        setTexto(resTexto.data?.texto ?? '');
        setConfirmacoes(resHistorico.data?.data ?? []);
      })
      .catch((err) => {
        if (ativo) setErro(getApiErrorMessage(err, 'Não foi possível carregar a confirmação.'));
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, []);

  const confirmar = async () => {
    setEnviando(true);
    setErro('');
    setBloqueadaPorSenha(false);

    try {
      const res = await portalService.confirmar();
      // A nova entra no topo. O backend devolve o registro projetado, então
      // não é preciso recarregar a lista inteira.
      setConfirmacoes((atuais) => [res.data, ...atuais]);
    } catch (err) {
      // 403 com código próprio: a confirmação está bloqueada porque a senha
      // ainda é a que a advogada criou. NÃO é erro genérico — a tela precisa
      // explicar o porquê, senão o cliente lê "acesso negado" numa ação que
      // ele tem todo o direito de fazer.
      if (codigoDoErro(err) === ERRO_PORTAL.CONFIRMACAO_EXIGE_SENHA_PROPRIA) {
        setBloqueadaPorSenha(true);
        return;
      }
      setErro(getApiErrorMessage(err, 'Não foi possível registrar a confirmação.'));
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <section className="portal-confirmacao">
        <p className="portal-texto">Carregando…</p>
      </section>
    );
  }

  const [ultima, ...anteriores] = confirmacoes;

  return (
    <section className="portal-confirmacao">
      <h2 className="portal-secao-titulo">Confirmação de leitura</h2>

      {ultima && (
        <div className="portal-recibo">
          <p className="portal-recibo__rotulo">
            Você confirmou a leitura em
          </p>
          <p className="portal-recibo__data">{formatarDataHora(ultima.dataHora)}</p>
        </div>
      )}

      {bloqueadaPorSenha && (
        <div className="portal-aviso" role="alert">
          <p>
            <strong>A confirmação ainda não está disponível.</strong> A senha
            que você está usando foi criada pela advogada e ela a conhece —
            enquanto for essa senha, a confirmação não serviria como prova de
            que <em>você</em> foi informado, porque outra pessoa poderia tê-la
            registrado no seu lugar.
          </p>
          <p style={{ marginTop: 'var(--space-3)' }}>
            <button
              type="button"
              className="portal-btn portal-btn--secundario portal-btn--linha"
              onClick={() => navigate('/portal/senha')}
            >
              Definir a minha senha
            </button>
          </p>
        </div>
      )}

      {erro && (
        <p className="portal-erro" role="alert">
          {erro}
        </p>
      )}

      {/* Literal. `pre-wrap` no CSS preserva as quebras da constante. */}
      <p className="portal-declaracao">{texto}</p>

      <button
        type="button"
        className="portal-btn portal-btn--principal"
        onClick={confirmar}
        disabled={enviando}
      >
        {enviando
          ? 'Registrando…'
          : ultima
            ? 'Confirmar novamente'
            : 'Confirmo que li as informações acima'}
      </button>

      {ultima && (
        <p className="portal-ajuda">
          Confirmar de novo <strong>não apaga</strong> a confirmação anterior:
          cada uma fica registrada com a sua data e hora. Faz sentido confirmar
          outra vez quando aparecer um documento novo.
        </p>
      )}

      {anteriores.length > 0 && (
        <>
          <h3 className="portal-secao-titulo" style={{ marginTop: 'var(--space-5)' }}>
            Confirmações anteriores
          </h3>
          <ul className="portal-lista">
            {anteriores.map((confirmacao) => (
              <li key={confirmacao.id} className="portal-historico-item">
                {formatarDataHora(confirmacao.dataHora)}
                {' · '}
                {confirmacao.instantaneo?.quantidadeDocumentos === 1
                  ? '1 documento disponível na ocasião'
                  : `${confirmacao.instantaneo?.quantidadeDocumentos ?? 0} documentos disponíveis na ocasião`}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export default PortalConfirmation;
