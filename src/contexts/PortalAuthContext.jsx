import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import portalService from '../api/portalService';
import { registrarPerdaDeSessao } from '../api/portalAxios';

// ═══════════════════════════════════════════════════════════════════════════
// SESSÃO DO PORTAL DO CLIENTE — contexto próprio, separado do `AuthContext`
//
// São duas autenticações diferentes, com cookies, segredos e ciclos de vida
// diferentes, e o mesmo navegador pode ter as duas ao mesmo tempo (a advogada
// testando o portal do cliente numa aba). Um contexto só teria de decidir
// "quem está logado", e essa pergunta não tem resposta única aqui.
//
// A fonte da verdade é `GET /portal/sessao`, não o corpo do login: o cookie é
// httpOnly e o JavaScript não o lê, então perguntar ao servidor é a única
// forma de saber se a sessão sobreviveu a um F5.
// ═══════════════════════════════════════════════════════════════════════════

const PortalAuthContext = createContext(null);

export function PortalAuthProvider({ children }) {
  // `null` = sem sessão. O objeto traz `{ senhaPortalProvisoria, papel,
  // processoId }`, que é exatamente o que a rota devolve.
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  const conferirSessao = useCallback(async () => {
    try {
      const res = await portalService.sessao();
      setSessao(res.data);
    } catch {
      // 401 aqui é o estado normal de quem ainda não entrou. Não é erro a
      // exibir: a tela de login é a resposta.
      setSessao(null);
    } finally {
      setCarregando(false);
    }
  }, []);

  const entrar = useCallback(async (codigoAcesso, senha) => {
    // O corpo do login já diz se a senha é provisória, mas quem manda é
    // `/sessao`: um só lugar decidindo o estado evita as duas fontes
    // divergirem no dia em que uma delas mudar.
    await portalService.login(codigoAcesso, senha);
    const res = await portalService.sessao();
    setSessao(res.data);
    return res.data;
  }, []);

  const trocarSenha = useCallback(async (senhaAtual, novaSenha) => {
    const res = await portalService.trocarSenha(senhaAtual, novaSenha);
    // O backend REEMITE o cookie na troca — o token anterior carrega o carimbo
    // da senha antiga e morre na requisição seguinte. Reler a sessão aqui é o
    // que faz o contexto acompanhar a reemissão.
    const atual = await portalService.sessao();
    setSessao(atual.data);
    return res.data;
  }, []);

  const sair = useCallback(async () => {
    try {
      await portalService.logout();
    } catch {
      // Falha na chamada não impede a limpeza local: num aparelho emprestado,
      // sair precisa funcionar mesmo com a rede ruim.
    } finally {
      setSessao(null);
      navigate('/portal', { replace: true });
    }
  }, [navigate]);

  // Sessão perdida no meio da navegação (expirou, vínculo desativado, senha
  // trocada em outro aparelho): o interceptor de `portalAxios` avisa aqui, e
  // quem navega é este contexto — para `/portal`, NUNCA para `/login`.
  useEffect(() => {
    registrarPerdaDeSessao(() => {
      setSessao(null);
      navigate('/portal', { replace: true });
    });
    return () => registrarPerdaDeSessao(null);
  }, [navigate]);

  useEffect(() => {
    conferirSessao();
  }, [conferirSessao]);

  const autenticado = sessao !== null;
  const senhaProvisoria = sessao?.senhaPortalProvisoria === true;

  return (
    <PortalAuthContext.Provider
      value={{
        sessao,
        carregando,
        autenticado,
        senhaProvisoria,
        papel: sessao?.papel ?? null,
        processoId: sessao?.processoId ?? null,
        entrar,
        trocarSenha,
        sair,
        conferirSessao,
      }}
    >
      {children}
    </PortalAuthContext.Provider>
  );
}

// O hook mora junto do provider por ser a interface de consumo dele — mesma
// decisão do `AuthContext`, e pelo mesmo motivo.
// eslint-disable-next-line react-refresh/only-export-components
export function usePortalAuth() {
  return useContext(PortalAuthContext);
}
