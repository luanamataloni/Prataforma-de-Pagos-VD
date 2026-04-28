// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN SUPERIOR (SOLO DESKTOP)
// ============================================================

// 1 - IMPORTO REACT ROUTER Y LOS ÍCONOS:
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, CreditCard, Wallet } from 'lucide-react';

// 2 - DEFINO LOS ÍTEMS DE NAVEGACIÓN (IGUAL QUE EL BOTTOM NAV):
const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Inicio'    },
  { to: '/clientes',  icon: Users,           label: 'Clientes'  },
  { to: '/servicios', icon: Package,         label: 'Servicios' },
  { to: '/pagos',     icon: CreditCard,      label: 'Pagos'     },
];

// 3 - RENDERIZO LA BARRA SUPERIOR:
export default function TopNav() {
  return (
    <header className="top-nav">

      {/* LOGO / MARCA */}
      <div className="top-nav-brand">
        <div className="top-nav-logo">
          <Wallet size={20} color="#7C3AED" />
        </div>
        <span className="top-nav-title">GestorPagos</span>
      </div>

      {/* LINKS DE NAVEGACIÓN */}
      <nav className="top-nav-links">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `top-nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={16} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </nav>

    </header>
  );
}

