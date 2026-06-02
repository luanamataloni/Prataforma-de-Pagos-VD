// ============================================================
// PROTECTED ROUTE - COMPONENTE GUARDAESPALDAS DE RUTAS
// ============================================================

// 1 - IMPORTO LOS HOOKS DE REACT ROUTER Y EL CONTEXTO:
import { Navigate } from 'react-router-dom';
import { useAuth }  from '../context/AuthContext';

// 2 - COMPONENTE QUE PROTEGE UNA RUTA:
export default function ProtectedRoute({ children, adminOnly = false, clientOnly = false }) {

  // 3 - OBTENGO EL ESTADO DE AUTENTICACIÓN:
  const { user, loading } = useAuth();

  // 4 - MIENTRAS CARGA, MUESTRO UN ESTADO VACÍO (evito flash de login):
  if (loading) {
    return (
      <div className="empty-state" style={{ paddingTop: 120 }}>
        <p>Cargando sesión...</p>
      </div>
    );
  }

  // 5 - SI NO HAY USUARIO, REDIRIJO AL LOGIN:
  if (!user) return <Navigate to="/login" replace />;

  // 6 - SI LA RUTA ES SOLO PARA ADMIN Y EL USUARIO NO LO ES, REDIRIJO:
  if (adminOnly && user.role !== 'admin') return <Navigate to="/mi-cuenta" replace />;

  // 7 - SI LA RUTA ES SOLO PARA CLIENTE Y EL USUARIO NO LO ES, REDIRIJO:
  if (clientOnly && user.role !== 'client') return <Navigate to="/" replace />;

  // 8 - TODO OK: RENDERIZO LA RUTA PROTEGIDA:
  return children;
}

