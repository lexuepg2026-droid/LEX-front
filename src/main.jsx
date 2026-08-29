import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { OutboxProvider } from './contexts/OutboxContext.jsx';
import registrarSW from './registrarSW.js';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        {/* A fila da F-5b envolve o app inteiro, e por dentro do
            `AuthProvider`: ela é escopada por usuário, e o reenvio automático
            precisa saber quem está logado. */}
        <OutboxProvider>
          <App />
        </OutboxProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// PWA (Fase 4.5). Guardado por `import.meta.env.PROD` dentro da função — em
// desenvolvimento o SW cachearia os módulos do Vite e a tela pararia de
// refletir o código, sem erro nenhum.
registrarSW();
