// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN INFERIOR (MOBILE)
// ============================================================

// 1 - IMPORTO REACT ROUTER, ÍCONOS Y CONTEXTO:
import { NavLink, useNavigate } from 'react-router-dom';
import { CreditCard, Users, Package, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// 2 - ÍTEMS SEGÚN ROL:
// ADMIN: Facturas (home) → Clientes → Servicios
const ADMIN_NAV = [
  { to: '/',          icon: CreditCard, label: 'Facturas'  },
  { to: '/clientes',  icon: Users,      label: 'Clientes'  },
  { to: '/servicios', icon: Package,    label: 'Servicios' },
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
