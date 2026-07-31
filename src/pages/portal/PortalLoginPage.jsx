import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { getApiErrorMessage } from '../../utils/apiError';
// A folha do portal é importada por CADA página, e não só pelo layout. O
// layout monta estas telas por `<Outlet/>`, e uma dependência que só existe
// pela árvore de rotas não é alcançável por análise estática — a varredura de
// classe CSS acusaria todas as classes daqui como sem regra, e teria razão:
// nada no arquivo diz de onde vem o estilo. O import é idempotente no bundle.
import '../../components/portal/Portal.css';

// ═══════════════════════════════════════════════════════════════════════════
// ENTRADA DO PORTAL — código de acesso + senha
//
// ── A tela nunca é mais rígida que a API ──────────────────────────────────
// NÃO se valida o formato do código aqui. Só campo vazio.
//
// O backend normaliza caixa e espaços DE PROPÓSITO, porque a advogada dita o
// código por telefone e o cliente o recebe por WhatsApp ou num papel. Uma
// máscara que recusasse `lex-77c8 8fvs` estaria recusando algo que o servidor
// aceitaria — e o cliente ficaria de fora do próprio processo por causa de uma
// letra minúscula, sem ter como descobrir o porquê.
//
// ── Uma mensagem só para o 401 ────────────────────────────────────────────
// `credenciaisInvalidas` cobre os seis casos (código inexistente, vínculo
// inativo, cliente sem senha, senha errada, cliente inativo, processo inativo)
// com corpo byte-idêntico. A tela não pode inventar diagnóstico que a resposta
// não dá: dizer "código não encontrado" transformaria o login em oráculo de
// códigos válidos para quem tem só o formato.
//
// ── O 429 é outra coisa ───────────────────────────────────────────────────
// Muitas tentativas tem mensagem PRÓPRIA. Confundi-lo com credencial inválida
// faz o cliente tentar de novo, o que estende o bloqueio — a interface estaria
// empurrando a pessoa para o exato comportamento que a piora.
// ═══════════════════════════════════════════════════════════════════════════

function PortalLoginPage() {
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [excessoDeTentativas, setExcessoDeTentativas] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const { entrar } = usePortalAuth();
  const navigate = useNavigate();

  const enviar = async (evento) => {
    evento.preventDefault();
    setErro('');
    setExcessoDeTentativas(false);

    // A única validação de cliente: campo vazio. Não é regra de formato — é
    // não gastar uma requisição (e uma tentativa do rate limit) com um pedido
    // que não tem o que enviar.
    if (codigoAcesso.trim() === '' || senha === '') {
      setErro('Preencha o código de acesso e a senha.');
      return;
    }

    setEnviando(true);
    try {
      const sessao = await entrar(codigoAcesso, senha);
      // Senha ainda provisória vai para a troca; o portão de rota faria isso de
      // qualquer forma, mas navegar daqui evita um quadro intermediário em que
      // a tela do processo pisca antes de ser substituída.
      navigate(sessao?.senhaPortalProvisoria === true ? '/portal/senha' : '/portal/processo', {
        replace: true,
      });
    } catch (err) {
      const status = err?.response?.status;

      if (status === 429) {
        setExcessoDeTentativas(true);
        return;
      }

      if (status === 401) {
        // Mensagem única, vinda do backend, sem enriquecimento. O fallback
        // repete o mesmo teor para o caso de a resposta não trazer corpo.
        setErro(getApiErrorMessage(err, 'Código de acesso ou senha inválidos.'));
        return;
      }

      setErro(getApiErrorMessage(err, 'Não foi possível entrar. Tente novamente.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="portal-cartao">
      <h1 className="portal-titulo">Acompanhe o seu processo</h1>
      <p className="portal-texto">
        Entre com o código de acesso e a senha que a advogada entregou a você.
      </p>

      {excessoDeTentativas && (
        <p className="portal-aviso" role="alert">
          <strong>Muitas tentativas seguidas.</strong> Por segurança, o acesso
          ficou bloqueado por alguns minutos. Aguarde e tente de novo — tentar
          agora só estende o bloqueio. Se você não lembra a senha, fale com a
          advogada: ela pode cadastrar uma nova.
        </p>
      )}

      {erro && (
        <p className="portal-erro" role="alert">
          {erro}
        </p>
      )}

      <form onSubmit={enviar} noValidate>
        {/* `.form-group` é obrigatório: o destaque de erro depende do seletor
            `.form-group input.input-erro`. Ver PortalLayout.css. */}
        <div className="form-group">
          <label htmlFor="portal-codigo">Código de acesso</label>
          <input
            id="portal-codigo"
            name="codigoAcesso"
            type="text"
            value={codigoAcesso}
            onChange={(e) => setCodigoAcesso(e.target.value)}
            /* `autoCapitalize="off"` evita o teclado do celular mandar a
               primeira letra maiúscula — não porque o backend recusaria (ele
               não recusa), mas porque o campo fica mais previsível. */
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck="false"
            autoComplete="username"
            inputMode="text"
            placeholder="LEX-0000-0000"
            disabled={enviando}
          />
        </div>

        <div className="form-group">
          <label htmlFor="portal-senha">Senha</label>
          <input
            id="portal-senha"
            name="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            disabled={enviando}
          />
        </div>

        <button type="submit" className="portal-btn portal-btn--principal" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      {/* Para quem chegou aqui sem saber o que é isto. O código circula por
          telefone e por papel, e alguém vai abrir a página sem ter recebido
          nada — dizer de onde vem o código é mais útil que qualquer
          instrução de formato. */}
      <p className="portal-ajuda">
        O código de acesso tem o formato <strong>LEX-0000-0000</strong> e foi
        entregue a você pela advogada, por mensagem, por telefone ou impresso.
        Pode digitar com letras maiúsculas ou minúsculas — tanto faz. Se você
        não tem um código ou não lembra a senha, entre em contato com o
        escritório.
      </p>
    </div>
  );
}

export default PortalLoginPage;
