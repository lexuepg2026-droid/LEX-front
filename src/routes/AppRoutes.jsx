import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import ConfirmEmailPage from '../pages/auth/ConfirmEmailPage';
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
import FeeDetailPage from '../pages/fees/FeeDetailPage';
import FeeRenegotiationPage from '../pages/fees/FeeRenegotiationPage';
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
import CalendarPage from '../pages/calendar/CalendarPage';
import EventFormPage from '../pages/calendar/EventFormPage';
import ProfilePage from '../pages/profile/ProfilePage';
import PendenciasPage from '../pages/pendencias/PendenciasPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import InicioPublico from '../pages/public/InicioPublico';

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
const PortalProcessListPage = lazy(() => import('../pages/portal/PortalProcessListPage'));

function AppRoutes() {
  return (
    <Routes>
      {/* DEC-082: `/` é a página inicial pública; o login fica em `/login`.
          Todo lugar que manda alguém entrar (portão de rota, logout, sessão
          expirada, fim da redefinição de senha, confirmação de e-mail) já
          apontava para `/login` — conferido na Fase 2a. */}
      <Route path="/" element={<InicioPublico />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registrar" element={<RegisterPage />} />

      {/* A-2 (DEC-064): as três telas que o e-mail abre. Públicas, e FORA do
          `ProtectedRoute` de propósito: quem esqueceu a senha não tem sessão, e
          quem clica no link de confirmação pode estar em outro navegador. */}
      <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
      <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
      <Route path="/confirmar-email" element={<ConfirmEmailPage />} />

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

        {/* Dado do processo: exige sessão E senha própria. Desde a Fase 2.5
            (DEC-096) o login é da pessoa: primeiro a lista dos processos
            LIBERADOS, depois cada um pelo id. A liberação é conferida pelo
            servidor a cada requisição — a URL direta de um processo não
            liberado responde 404. */}
        <Route element={<PortalProtectedRoute />}>
          <Route path="processos" element={<PortalProcessListPage />} />
          <Route path="processos/:processoId" element={<PortalProcessPage />} />
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
          {/* A página do honorário (F-1b) — o centro da UX do dinheiro.
              Declarada DEPOIS de `novo` e de `editar/:id` por clareza; o
              ranking do react-router já daria precedência ao segmento
              estático, mas a ordem do arquivo é o que se lê. Não há item de
              menu para ela: chega-se pelos links do nome do honorário. */}
          <Route path="honorarios/:id" element={<FeeDetailPage />} />
          {/* DEC-049: o reparcelamento tem ROTA própria, e não modal — o plano
              tem N linhas e uma soma corrente que precisa ficar visível. */}
          <Route path="honorarios/:id/reparcelar" element={<FeeRenegotiationPage />} />

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

          {/* ── A agenda (F-3) ────────────────────────────────────────────
              `/agenda`, e não `/calendario`: é a palavra que a advogada usa
              para a coisa, e é o rótulo do menu. A rota é o nome do lugar, e
              esta é a exceção que a convenção já prevê — sub-recursos que
              nomeiam conceito do domínio em português (`/secoes`, `/clientes`,
              `/reordenar`).

              A VISTA e o MÊS vivem na query string (`?vista=`, `?mes=`), e não
              no caminho: navegar entre meses não pode perder a vista, e o botão
              "voltar" do navegador precisa desfazer a navegação de mês. */}
          <Route path="agenda" element={<CalendarPage />} />
          <Route path="agenda/novo" element={<EventFormPage />} />
          <Route path="agenda/editar/:id" element={<EventFormPage />} />

          {/* ── A fila da F-5b (DEC-059) ──────────────────────────────────
              Rota própria, e não modal: a lista tem N entradas, cada uma com
              uma decisão possível, e o conflito mostra duas versões lado a
              lado. É o mesmo critério da DEC-049 — modal serve para decisão
              curta. Não há item de menu: chega-se pelo contador ao lado do
              sino, que só aparece quando há o que resolver. */}
          <Route path="pendencias" element={<PendenciasPage />} />

          <Route path="perfil" element={<ProfilePage />} />

          {/* Endereço inexistente DENTRO da área da advogada: a página de
              "não encontrada" com o cabeçalho em volta, para a saída ser a
              navegação de sempre (Fase 2a). */}
          <Route path="*" element={<NotFoundPage dentroDoLayout />} />
        </Route>
      </Route>

      {/* Rota coringa de todo o resto — inclusive `/portal/…` inexistente, que
          o ramo do portal não casa. Fica FORA do `ProtectedRoute`: quem não
          tem sessão também erra endereço, e não pode ser mandado ao login por
          isso. */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
