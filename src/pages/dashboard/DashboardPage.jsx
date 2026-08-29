import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import Modal from '../../components/ui/Modal';
import { getTheme as getStoredTheme, setTheme as setStoredTheme, removeTheme } from '../../utils/storage';
import { useAuth } from '../../contexts/AuthContext';
import { useOutbox } from '../../contexts/OutboxContext';
import { mensagemDeLogoutComFila } from '../../offline/outboxMessages';

function DashboardPage() {
  const { logout } = useAuth();
  const { quantidade } = useOutbox();
  const [theme, setTheme] = useState(getStoredTheme());
  const [avisoDeFila, setAvisoDeFila] = useState(false);

  useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
    setStoredTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const sair = async () => {
    // Limpeza local do tema; a sessão (zerar user + navegar) fica no contexto.
    document.body.classList.remove('light-mode');
    removeTheme();
    await logout();
  };

  // ── O LOGOUT COM FILA PENDENTE — a tensão com a DEC-058 (F-5b, Parte 2) ─
  //
  // A DEC-058 manda **apagar tudo** no logout, e ela continua valendo: sair da
  // conta num computador emprestado precisa deixar o navegador limpo. Mas a
  // fila não é cache — ela é trabalho que a advogada fez e que **nunca chegou
  // ao servidor**. Apagá-la junto, em silêncio, seria perda de dado sem aviso.
  //
  // A saída é avisar ANTES, dizendo QUANTAS são, e deixar a escolha com ela.
  // Nem apagar calado, nem segurar o logout: as duas coisas decidem por ela.
  //
  // **Por que não tentar enviar antes de sair:** se houvesse sinal, a fila já
  // teria subido sozinha — o reenvio dispara quando o sinal volta. Uma fila que
  // ainda existe no momento do logout ou está sem sinal (e não vai subir) ou
  // travou numa falha (e precisa de decisão, não de mais uma tentativa). Segurar
  // a saída para tentar de novo prenderia a advogada numa espera que já se sabe
  // inútil — e num computador emprestado é justamente a hora em que ela precisa
  // sair depressa.
  const handleLogout = async () => {
    if (quantidade > 0) {
      setAvisoDeFila(true);
      return;
    }
    await sair();
  };

  return (
    <>
      <AppLayout theme={theme} toggleTheme={toggleTheme} onLogout={handleLogout} />

      <Modal
        open={avisoDeFila}
        title="Sair com alterações não enviadas"
        message={mensagemDeLogoutComFila(quantidade)}
        variant="danger"
        confirmLabel="Sair e descartar"
        cancelLabel="Continuar no sistema"
        onConfirm={async () => { setAvisoDeFila(false); await sair(); }}
        onCancel={() => setAvisoDeFila(false)}
      />
    </>
  );
}

export default DashboardPage;
