import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProtectedRoute from '../components/common/ProtectedRoute';
import DashboardHomePage from '../pages/dashboard/DashboardHomePage';
import ClienteListPage from '../pages/clients/ClientListPage';
import ClienteFormPage from '../pages/clients/ClientFormPage';
import ClientDetailPage from '../pages/clients/ClientDetailPage';
import ProcessoListPage from '../pages/processes/ProcessListPage';
import ProcessoFormPage from '../pages/processes/ProcessFormPage';
import ProcessoDetalhePage from '../pages/processes/ProcessDetailPage';
import FeeListPage from '../pages/fees/FeeListPage';
import FeeFormPage from '../pages/fees/FeeFormPage';
import InstallmentListPage from '../pages/installments/InstallmentListPage';
import InstallmentFormPage from '../pages/installments/InstallmentFormPage';
import DocumentListPage from '../pages/documents/DocumentListPage';
import DocumentAssemblyPage from '../pages/documents/DocumentAssemblyPage';
import DocumentFinalTextPage from '../pages/documents/DocumentFinalTextPage';
import SecaoListPage from '../pages/secoes/SecaoListPage';
import SecaoFormPage from '../pages/secoes/SecaoFormPage';
import PaymentListPage from '../pages/payments/PaymentListPage';
import PaymentFormPage from '../pages/payments/PaymentFormPage';
import FinanceiroPage from '../pages/financeiro/FinanceiroPage';
import ProfilePage from '../pages/profile/ProfilePage';

// ═══════════════════════════════════════════════════════════════════════════
// PORTAL DO CLIENTE — mesmo app, chunk próprio
//
// Tudo do portal entra por `lazy()`, no mesmo padrão que `DashboardCharts`
// (`DashboardHomePage.jsx:13`). Um build e um deploy: o PWA existente continua
// valendo, não há segundo domínio para configurar e nem segundo CORS para
// esquecer.
//
// O chunk separado é o que torna isso honesto. Sem ele, o cliente baixaria o
// bundle inteiro das telas da advogada — Financeiro, Perfil, montagem de
// documento, `recharts` — para ver um processo e dois PDFs, no celular dele,
// na rede dele.
//
// As rotas ficam FORA do `ProtectedRoute` e FORA do layout com Sidebar e
// Header. Não é organização: o portão da advogada manda para `/login`, e um
// cliente que caísse lá veria a tela de login de um sistema que não é dele.
// ═══════════════════════════════════════════════════════════════════════════
// `PortalAuthProvider` é export nomeado — o `lazy` exige um `default`, daí o
// `.then`. Carregá-lo por `lazy` junto com o resto é o que mantém o contexto
// do portal (e o `axios` do portal) fora do bundle inicial da advogada.
const PortalAuthProvider = lazy(() =>
  import('../contexts/PortalAuthContext').then((m) => ({ default: m.PortalAuthProvider }))
);
const PortalLayout = lazy(() => import('../components/portal/PortalLayout'));
const PortalProtectedRoute = lazy(() => import('../components/portal/PortalProtectedRoute'));
const PortalLoginPage = lazy(() => import('../pages/portal/PortalLoginPage'));
const PortalPasswordPage = lazy(() => import('../pages/portal/PortalPasswordPage'));
const PortalProcessPage = lazy(() => import('../pages/portal/PortalProcessPage'));

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrar" element={<RegisterPage />} />

      {/* ── Portal do cliente ──────────────────────────────────────────────
          O `PortalAuthProvider` envolve SÓ este ramo: fora dele o contexto do
          portal não existe, e nenhuma tela da advogada pode consultá-lo por
          engano. */}
      <Route
        path="/portal"
        element={
          <Suspense fallback={<div className="portal-carregando">Carregando…</div>}>
            <PortalAuthProvider>
              <PortalLayout />
            </PortalAuthProvider>
          </Suspense>
        }
      >
        <Route index element={<PortalLoginPage />} />

        {/* Troca obrigatória: exige sessão, e é a ÚNICA rota alcançável
            enquanto a senha for provisória. */}
        <Route element={<PortalProtectedRoute permitirSenhaProvisoria />}>
          <Route path="senha" element={<PortalPasswordPage />} />
        </Route>

        {/* Dado do processo: exige sessão E senha própria. */}
        <Route element={<PortalProtectedRoute />}>
          <Route path="processo" element={<PortalProcessPage />} />
        </Route>
      </Route>

      <Route path="/dashboard" element={<ProtectedRoute />}>
        <Route element={<DashboardPage />}>
          <Route index element={<DashboardHomePage />} />

          <Route path="clientes" element={<ClienteListPage />} />
          <Route path="clientes/novo" element={<ClienteFormPage />} />
          <Route path="clientes/editar/:id" element={<ClienteFormPage />} />
          <Route path="clientes/detalhe/:id" element={<ClientDetailPage />} />

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

          <Route path="documentos" element={<DocumentListPage />} />

          {/* UMA tela de montagem, DOIS modos, DUAS portas de entrada.
              O modo vem em `?modo=modelo|documento` e não no caminho: são o
              mesmo recurso sendo montado, e duas rotas para a mesma tela dariam
              dois jeitos de dizer a mesma coisa. As duas portas do menu são
              links para esta rota com o `modo` diferente. */}
          <Route path="documentos/montar" element={<DocumentAssemblyPage />} />
          <Route path="documentos/montar/:id" element={<DocumentAssemblyPage />} />

          {/* Editor de texto final de um documento já gerado. */}
          <Route path="documentos/:id/texto" element={<DocumentFinalTextPage />} />

          <Route path="secoes" element={<SecaoListPage />} />
          <Route path="secoes/nova" element={<SecaoFormPage />} />
          <Route path="secoes/editar/:id" element={<SecaoFormPage />} />

          <Route path="pagamentos" element={<PaymentListPage />} />
          <Route path="pagamentos/novo" element={<PaymentFormPage />} />
          <Route path="pagamentos/editar/:id" element={<PaymentFormPage />} />

          <Route path="financeiro" element={<FinanceiroPage />} />

          <Route path="perfil" element={<ProfilePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRoutes;
