// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN INFERIOR (MOBILE)
// ============================================================

// 1 - IMPORTO REACT ROUTER, ÍCONOS Y CONTEXTO:
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, CreditCard, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// 2 - ÍTEMS SEGÚN ROL:
const ADMIN_NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Resumen'   },
  { to: '/clientes',  icon: Users,           label: 'Clientes'  },
  { to: '/servicios', icon: Package,         label: 'Servicios' },
  { to: '/factura',   icon: CreditCard,      label: 'Facturas'  },
  { to: '/perfil',    icon: Settings,        label: 'Perfil'    },
];
const CLIENT_NAV = [
  { to: '/mi-cuenta', icon: CreditCard, label: 'Mi Cuenta' },
];

// 3 - RENDERIZO LA BARRA INFERIOR:
export default function BottomNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.role === 'admin' ? ADMIN_NAV : CLIENT_NAV;

  // 4 - LOGOUT:
  function handleLogout() { logout(); navigate('/login'); }

  return (
    <nav className="bottom-nav">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <div className="nav-icon-bg"><Icon size={20} strokeWidth={2} /></div>
          <span>{label}</span>
        </NavLink>
      ))}

      {/* BOTÓN SALIR */}
      <button className="nav-item" onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
        <div className="nav-icon-bg"><LogOut size={20} strokeWidth={2} /></div>
        <span>Salir</span>
      </button>
    </nav>
  );
}
