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
import FeeListPage from './pages/fees/FeeListPage';
import FeeFormPage from './pages/fees/FeeFormPage';
import InstallmentListPage from './pages/installments/InstallmentListPage';
import InstallmentFormPage from './pages/installments/InstallmentFormPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrar" element={<RegisterPage />} />
      <Route path="/" element={<LoginPage />} />

      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route element={<DashboardPage />}>
          <Route index element={<DashboardHomePage />} />

          <Route path="clientes" element={<ClienteListPage />} />
          <Route path="clientes/novo" element={<ClienteFormPage />} />
          <Route path="clientes/editar/:id" element={<ClienteFormPage />} />

          <Route path="processos" element={<ProcessoListPage />} />
          <Route path="processos/novo" element={<ProcessoFormPage />} />
          <Route path="processos/editar/:id" element={<ProcessoFormPage />} />
          <Route path="processos/detalhe/:id" element={<ProcessoDetalhePage />} />

          <Route path="honorarios" element={<FeeListPage />} />
          <Route path="honorarios/novo" element={<FeeFormPage />} />
          <Route path="honorarios/editar/:id" element={<FeeFormPage />} />

          <Route path="parcelas" element={<InstallmentListPage />} />
          <Route path="parcelas/novo" element={<InstallmentFormPage />} />
          <Route path="parcelas/editar/:id" element={<InstallmentFormPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;