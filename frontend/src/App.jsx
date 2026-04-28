// ============================================================
// APP.JSX - COMPONENTE RAÍZ CON LAS RUTAS
// ============================================================

// 1 - IMPORTO LAS RUTAS Y LOS COMPONENTES:
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import TopNav    from './components/TopNav';

// 2 - IMPORTO LAS PÁGINAS:
import Dashboard from './pages/Dashboard';
import Clientes  from './pages/Clientes';
import Servicios from './pages/Servicios';
import Pagos     from './pages/Pagos';

// 3 - DEFINO EL LAYOUT PRINCIPAL:
// - En MOBILE:  BottomNav visible, TopNav oculto
// - En DESKTOP: TopNav visible, BottomNav oculto (controlado por CSS)
export default function App() {
  return (
    <>
      {/* MENÚ SUPERIOR (solo visible en desktop, oculto en mobile por CSS) */}
      <TopNav />

      {/* CONTENEDOR PRINCIPAL */}
      <div className="app-layout">

        {/* CONTENIDO DE CADA PÁGINA */}
        <div className="page-content">
          <Routes>
            <Route path="/"          element={<Dashboard />} />
            <Route path="/clientes"  element={<Clientes />}  />
            <Route path="/servicios" element={<Servicios />} />
            <Route path="/pagos"     element={<Pagos />}     />
          </Routes>
        </div>

        {/* MENÚ INFERIOR (solo visible en mobile, oculto en desktop por CSS) */}
        <BottomNav />

      </div>
    </>
  );
}

