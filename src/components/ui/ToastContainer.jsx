import { useState, useEffect } from 'react';
import { subscribe } from '../../utils/toast';
import '../../styles/toast.css';

const DURATION = 3000;

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return subscribe((incoming) => {
      setToasts(prev => [...prev, incoming]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== incoming.id));
      }, DURATION);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite" aria-atomic="false">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`} role="status">
          {t.message}
        </div>
      ))}
    </div>
  );
}
