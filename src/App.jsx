import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ProtectedRoute from './components/common/ProtectedRoute';

import DashboardHomePage from './pages/dashboard/DashboardHomePage';
import ClienteListPage from './pages/clients/ClientListPage';
import ClienteFormPage from './pages/clients/ClientFormPage';
import ProcessoListPage from './pages/processes/ProcessListPage';
import ProcessoFormPage from './pages/processes/ProcessFormPage';
import ProcessoDetalhePage from './pages/processes/ProcessDetailPage';

function App() {
  return (
    <Routes>
      {/* Rotas Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrar" element={<RegisterPage />} />
      <Route path="/" element={<LoginPage />} />
      
      {/* Rota Protegida (Pai) */}
      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route element={<DashboardPage />}> 
          
          <Route index element={<DashboardHomePage />} />
          <Route path="clientes" element={<ClienteListPage />} />
          <Route path="clientes/novo" element={<ClienteFormPage />} />
          <Route path="clientes/editar/:id" element={<ClienteFormPage />} />
          
          <Route path="processos" element={<ProcessoListPage />} />
          <Route path="processos/novo" element={<ProcessoFormPage />} />
          <Route path="processos/editar/:id" element={<ProcessoFormPage />} />
          
          {/* 2. ADICIONE A NOVA ROTA DE DETALHES */}
          <Route path="processos/detalhe/:id" element={<ProcessoDetalhePage />} />
        
        </Route>
      </Route>

    </Routes>
  );
}

export default App;