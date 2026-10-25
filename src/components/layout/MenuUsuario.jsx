import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, MailWarning, Moon, Sun, UserCog } from 'lucide-react';
import MenuSuspenso from './MenuSuspenso.jsx';
import { PERFIL, iniciais, primeiroNome } from './navegacao.js';
import useConfirmacaoEmail from '../../hooks/useConfirmacaoEmail';
import { toast } from '../../utils/toast';
import './MenuUsuario.css';

// O menu do usuário (Fase 2a): "Olá, {nome}" e o círculo de iniciais, como na
// Figura 17. Abre Perfil, a troca de tema e Sair.
//
// Tema e Sair são EXATAMENTE as funções que a Sidebar recebia: `toggleTheme` e
// `onLogout` vêm do `DashboardPage`, e o `onLogout` continua sendo o que avisa
// da fila offline antes de sair (F-5b). Nada foi reescrito aqui.
//
// O mesmo componente serve ao cabeçalho largo e à barra compacta do celular;
// abaixo de 1024 px a saudação some e fica só o círculo (DEC-079).
//
// Fase 2b (DEC-088): com o e-mail não confirmado, um ponto de alerta no
// círculo e o item "Confirmar e-mail", que reenvia. É a indicação que NÃO se
// dispensa — a faixa de cima pode ser dispensada até o próximo login, e sem
// isto a advogada perderia o caminho. Os dois somem quando o e-mail é
// confirmado.
function MenuUsuario({ theme, toggleTheme, onLogout }) {
  const { user, pendente, enviando, reenviar } = useConfirmacaoEmail();
  const nomeCompleto = user?.nomeCompleto || '';
  if (!nomeCompleto) return null;

  const confirmar = async (fechar) => {
    fechar({ devolverFoco: true });
    const resultado = await reenviar();
    if (resultado.tipo === 'ok') toast.success(resultado.texto);
    else if (!resultado.jaAvisado) toast.error(resultado.texto);
  };

  return (
    <MenuSuspenso
      className="menu-usuario"
      painelClassName="menu-suspenso__painel--direita"
      rotuloDoBotao={`Menu de ${nomeCompleto}${pendente ? ' — e-mail não confirmado' : ''}`}
      conteudoDoBotao={(
        <>
          <span className="menu-usuario__saudacao">Olá, {primeiroNome(nomeCompleto)}</span>
          <span className="menu-usuario__avatar" aria-hidden="true">
            {iniciais(nomeCompleto)}
            {pendente && <span className="menu-usuario__alerta" />}
          </span>
        </>
      )}
    >
      {(fechar) => (
        <ul className="menu-suspenso__lista">
          {pendente && (
            <li>
              <button
                type="button"
                className="menu-suspenso__item menu-suspenso__item--alerta"
                onClick={() => confirmar(fechar)}
                disabled={enviando}
              >
                <MailWarning size={16} aria-hidden="true" />
                {enviando ? 'Enviando…' : 'Confirmar e-mail'}
              </button>
            </li>
          )}
          <li>
            <Link to={PERFIL.to} className="menu-suspenso__item">
              <UserCog size={16} aria-hidden="true" />
              {PERFIL.label}
            </Link>
          </li>
          <li>
            <button
              type="button"
              className="menu-suspenso__item"
              onClick={() => { toggleTheme(); fechar({ devolverFoco: true }); }}
            >
              {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
              {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            </button>
          </li>
          <li>
            <button
              type="button"
              className="menu-suspenso__item menu-suspenso__item--sair"
              onClick={() => { fechar(); onLogout(); }}
            >
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </li>
        </ul>
      )}
    </MenuSuspenso>
  );
}

export default MenuUsuario;
