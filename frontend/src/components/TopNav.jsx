// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN SUPERIOR (SOLO DESKTOP)
// ============================================================

// 1 - IMPORTO REACT ROUTER, ÍCONOS Y CONTEXTO:
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, CreditCard, Wallet, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// 2 - ÍTEMS SEGÚN ROL:
const ADMIN_NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Inicio'    },
  { to: '/clientes',  icon: Users,           label: 'Clientes'  },
  { to: '/servicios', icon: Package,         label: 'Servicios' },
  { to: '/factura',   icon: CreditCard,      label: 'Facturas'  },
];
const CLIENT_NAV = [
  { to: '/mi-cuenta', icon: CreditCard, label: 'Mi Cuenta' },
];

// 3 - RENDERIZO LA BARRA SUPERIOR:
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = user?.role === 'admin' ? ADMIN_NAV : CLIENT_NAV;

  // 4 - LOGOUT: BORRO TOKEN Y VOY AL LOGIN:
  function handleLogout() { logout(); navigate('/login'); }

  return (
    <header className="top-nav">

      {/* LOGO */}
      <div className="top-nav-brand">
        <div className="top-nav-logo"><Wallet size={20} color="#7C3AED" /></div>
        <span className="top-nav-title">GestorPagos</span>
      </div>

      {/* LINKS DE NAVEGACIÓN */}
      <nav className="top-nav-links">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `top-nav-link${isActive ? ' active' : ''}`}>
            <Icon size={16} strokeWidth={2} />{label}
          </NavLink>
        ))}
      </nav>

      {/* USUARIO Y LOGOUT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {user?.email}
        </span>
        <button className="btn-icon" onClick={handleLogout} title="Cerrar sesión"><LogOut size={18} /></button>
      </div>

    </header>
  );
}
