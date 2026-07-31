import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePortalAuth } from '../../contexts/PortalAuthContext';
import { getApiErrorField, getApiErrorMessage } from '../../utils/apiError';
// Ver a nota em `PortalLoginPage.jsx`: cada página do portal importa a folha,
// porque o estilo que chega pelo layout não é alcançável por análise estática.
import '../../components/portal/Portal.css';

// ═══════════════════════════════════════════════════════════════════════════
// TROCA OBRIGATÓRIA DA SENHA PROVISÓRIA
//
// ── Por que é obrigatória (DEC-029, ponto 4) ──────────────────────────────
// Enquanto a advogada conhecer a senha, a confirmação de leitura é repudiável
// e não serve como prova de que o cliente foi informado. Ela definiu a senha
// inicial e a entregou; enquanto for essa senha, ela consegue entrar como se
// fosse ele e clicar em "confirmo que li".
//
// Essa frase está na tela, em uma linha, porque uma troca obrigatória sem
// motivo declarado parece burocracia — e o que ela protege é justamente o
// cliente.
//
// A tela não é a segurança: o backend responde 403 em toda rota de dado
// enquanto a senha for provisória, e recusa a confirmação com um código
// próprio. Aqui só se evita que o cliente descubra isso batendo em erro.
// ═══════════════════════════════════════════════════════════════════════════

function PortalPasswordPage() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [repeticao, setRepeticao] = useState('');

  const [erro, setErro] = useState('');
  const [campoComErro, setCampoComErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const { trocarSenha } = usePortalAuth();
  const navigate = useNavigate();

  const enviar = async (evento) => {
    evento.preventDefault();
    setErro('');
    setCampoComErro(null);

    if (senhaAtual === '' || novaSenha === '') {
      setErro('Preencha a senha atual e a nova senha.');
      return;
    }

    // A repetição é conferida AQUI, e não no backend, porque o backend não
    // recebe a repetição: ela existe para pegar erro de digitação numa senha
    // que ninguém vê. Mandá-la ao servidor seria trafegar a senha duas vezes
    // sem ganho nenhum.
    if (novaSenha !== repeticao) {
      setCampoComErro('repeticao');
      setErro('A repetição não confere com a nova senha.');
      return;
    }

    setEnviando(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      navigate('/portal/processo', { replace: true });
    } catch (err) {
      // O backend diz QUAL campo está errado (`senhaAtual` ou `novaSenha`) e
      // devolve a mensagem específica — senha fraca, senha igual ao CPF, senha
      // repetindo a provisória. Exibir uma mensagem genérica aqui apagaria a
      // única informação que permite ao cliente corrigir.
      setCampoComErro(getApiErrorField(err));
      setErro(getApiErrorMessage(err, 'Não foi possível alterar a senha.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="portal-cartao">
      <h1 className="portal-titulo">Defina a sua senha</h1>

      <p className="portal-texto portal-texto--forte">
        A senha que você recebeu foi criada pela advogada e ela a conhece.
        Enquanto for essa senha, a confirmação de leitura não vale como prova de
        que <em>você</em> foi informado — por isso a troca é obrigatória antes
        de continuar.
      </p>

      {erro && (
        <p className="portal-erro" role="alert">
          {erro}
        </p>
      )}

      <form onSubmit={enviar} noValidate>
        <div className="form-group">
          <label htmlFor="portal-senha-atual">Senha atual (a que você recebeu)</label>
          <input
            id="portal-senha-atual"
            name="senhaAtual"
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            className={campoComErro === 'senhaAtual' ? 'input-erro' : undefined}
            autoComplete="current-password"
            disabled={enviando}
          />
        </div>

        <div className="form-group">
          <label htmlFor="portal-nova-senha">Nova senha</label>
          <input
            id="portal-nova-senha"
            name="novaSenha"
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className={campoComErro === 'novaSenha' ? 'input-erro' : undefined}
            autoComplete="new-password"
            disabled={enviando}
          />
        </div>

        <div className="form-group">
          <label htmlFor="portal-repeticao">Repita a nova senha</label>
          <input
            id="portal-repeticao"
            name="repeticao"
            type="password"
            value={repeticao}
            onChange={(e) => setRepeticao(e.target.value)}
            className={campoComErro === 'repeticao' ? 'input-erro' : undefined}
            autoComplete="new-password"
            disabled={enviando}
          />
        </div>

        <button type="submit" className="portal-btn portal-btn--principal" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar e continuar'}
        </button>
      </form>

      <p className="portal-ajuda">
        A nova senha precisa ser diferente da que você recebeu e não pode ser o
        seu CPF ou CNPJ. Guarde-a: a advogada não tem como consultá-la depois —
        se você esquecer, ela cadastra uma nova provisória e você troca de novo.
      </p>
    </div>
  );
}

export default PortalPasswordPage;
