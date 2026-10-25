import { useState, useEffect, useRef, useCallback } from 'react';
import { subscribe, duracaoDe, regiaoDe } from '../../utils/toast';
import '../../styles/toast.css';

// ═══════════════════════════════════════════════════════════════════════════
// AS DUAS REGIÕES E O AVISO QUE ESPERA QUEM LÊ (Fase 2b, DEC-083)
//
// As regiões ficam SEMPRE montadas, vazias quando não há aviso. Região viva
// que nasce junto com o conteúdo não é anunciada por todo leitor de tela — o
// `return null` de antes fazia o primeiro toast de cada rajada chegar mudo.
//
// Cada aviso conta o próprio tempo e PAUSA enquanto o mouse está em cima ou o
// foco está dentro: quem chegou ao × por Tab, ou está relendo a frase, não
// pode vê-la sumir debaixo dos olhos. Escape fecha o aviso focado e o foco
// volta para onde estava antes de entrar nele.
// ═══════════════════════════════════════════════════════════════════════════

function Aviso({ aviso, aoFechar }) {
  const restante = useRef(duracaoDe(aviso.type));
  const inicio = useRef(0);
  const temporizador = useRef(null);
  const origemDoFoco = useRef(null);
  const raiz = useRef(null);
  const [pausado, setPausado] = useState({ mouse: false, foco: false });

  const fechar = useCallback(() => {
    // Se o foco estava dentro do aviso, ele volta a quem estava antes — sem
    // isso, fechar pelo × deixaria o foco no `body`, no topo da página.
    if (raiz.current?.contains(document.activeElement)) {
      const origem = origemDoFoco.current;
      if (origem && origem.isConnected) origem.focus();
    }
    aoFechar(aviso.id);
  }, [aoFechar, aviso.id]);

  const parado = pausado.mouse || pausado.foco;

  useEffect(() => {
    if (parado) return undefined;
    inicio.current = Date.now();
    temporizador.current = setTimeout(fechar, restante.current);
    return () => {
      clearTimeout(temporizador.current);
      restante.current = Math.max(0, restante.current - (Date.now() - inicio.current));
    };
  }, [parado, fechar]);

  const aoFocar = (e) => {
    if (!raiz.current?.contains(e.relatedTarget)) origemDoFoco.current = e.relatedTarget;
    setPausado((p) => ({ ...p, foco: true }));
  };

  const aoDesfocar = (e) => {
    if (raiz.current?.contains(e.relatedTarget)) return;
    setPausado((p) => ({ ...p, foco: false }));
  };

  const aoTeclar = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      fechar();
    }
  };

  return (
    <div
      ref={raiz}
      className={`toast toast--${aviso.type}`}
      onMouseEnter={() => setPausado((p) => ({ ...p, mouse: true }))}
      onMouseLeave={() => setPausado((p) => ({ ...p, mouse: false }))}
      onFocus={aoFocar}
      onBlur={aoDesfocar}
      onKeyDown={aoTeclar}
    >
      <span className="toast__mensagem">{aviso.message}</span>
      <button type="button" className="toast__fechar" aria-label="Fechar aviso" onClick={fechar}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribe((incoming) => {
      setToasts(prev => [...prev, incoming]);
    });
  }, []);

  const remover = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const erros = toasts.filter(t => regiaoDe(t.type) === 'alert');
  const demais = toasts.filter(t => regiaoDe(t.type) === 'status');

  return (
    <div className="toast-container">
      <div className="toast-regiao" role="alert" aria-live="assertive" aria-atomic="false">
        {erros.map(t => <Aviso key={t.id} aviso={t} aoFechar={remover} />)}
      </div>
      <div className="toast-regiao" role="status" aria-live="polite" aria-atomic="false">
        {demais.map(t => <Aviso key={t.id} aviso={t} aoFechar={remover} />)}
      </div>
    </div>
  );
}
