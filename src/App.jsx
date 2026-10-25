import AppRoutes from './routes/AppRoutes';
import { ToastContainer } from './components/ui/ToastContainer';
import VoltarAoTopo from './components/layout/VoltarAoTopo.jsx';

function App() {
  return (
    <>
      {/* Páginas públicas e portal rolam o `window`; a área da advogada tem
          o seu próprio, em `AppLayout`. */}
      <VoltarAoTopo />
      <AppRoutes />
      <ToastContainer />
    </>
  );
}

export default App;
