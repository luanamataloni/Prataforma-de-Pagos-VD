// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN INFERIOR
// ============================================================

// 1 - IMPORTO REACT ROUTER Y LOS ÍCONOS:
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Package, CreditCard } from 'lucide-react';

// 2 - DEFINO LOS ÍTEMS DE NAVEGACIÓN:
const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Inicio'    },
  { to: '/clientes',  icon: Users,           label: 'Clientes'  },
  { to: '/servicios', icon: Package,         label: 'Servicios' },
  { to: '/pagos',     icon: CreditCard,      label: 'Pagos'     },
];

// 3 - RENDERIZO LA BARRA DE NAVEGACIÓN:
export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          {/* ÍCONO CON FONDO REDONDEADO */}
          <div className="nav-icon-bg">
            <Icon size={20} strokeWidth={2} />
          </div>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

