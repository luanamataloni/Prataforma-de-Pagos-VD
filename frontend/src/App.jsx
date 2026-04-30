// ============================================================
// APP.JSX - COMPONENTE RAÍZ CON AUTENTICACIÓN Y RUTAS
// ============================================================

// 1 - IMPORTO LAS RUTAS Y LOS COMPONENTES:
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BottomNav      from './components/BottomNav';
import TopNav         from './components/TopNav';
import ProtectedRoute from './components/ProtectedRoute';

// 2 - IMPORTO LAS PÁGINAS:
import Dashboard     from './pages/Dashboard';
import Clientes      from './pages/Clientes';
import Servicios     from './pages/Servicios';
import Factura       from './pages/Factura';
import Login         from './pages/Login';
import ClienteHome   from './pages/ClienteHome';
import FacturasAdmin from './pages/FacturasAdmin';
import Perfil        from './pages/Perfil';

// 3 - LAYOUT PRINCIPAL (con nav):
function AppLayout() {
  const { user } = useAuth();
  return (
    <>
      <TopNav />
      <div className="app-layout">
        <div className="page-content">
          <Routes>
            {/* RUTAS DE ADMINISTRADOR */}
            <Route path="/"               element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
            <Route path="/clientes"       element={<ProtectedRoute adminOnly><Clientes /></ProtectedRoute>} />
            <Route path="/servicios"      element={<ProtectedRoute adminOnly><Servicios /></ProtectedRoute>} />
            <Route path="/factura"        element={<ProtectedRoute adminOnly><Factura /></ProtectedRoute>} />
            <Route path="/facturas-admin" element={<ProtectedRoute adminOnly><FacturasAdmin /></ProtectedRoute>} />
            <Route path="/perfil"         element={<ProtectedRoute adminOnly><Perfil /></ProtectedRoute>} />

            {/* RUTA DE CLIENTE (acceso solo a su home) */}
            <Route path="/mi-cuenta"      element={<ProtectedRoute clientOnly><ClienteHome /></ProtectedRoute>} />

            {/* FALLBACK */}
            <Route path="*" element={<Navigate to={user?.role === 'client' ? '/mi-cuenta' : '/'} replace />} />
          </Routes>
        </div>
        <BottomNav />
      </div>
    </>
  );
}

// 4 - APP RAÍZ CON PROVEEDOR DE AUTH:
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* RUTA PÚBLICA */}
        <Route path="/login" element={<Login />} />

        {/* TODAS LAS DEMÁS RUTAS USAN EL LAYOUT CON NAV */}
        <Route path="/*" element={<AppLayout />} />
      </Routes>
    </AuthProvider>
  );
}
