// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN SUPERIOR (SOLO DESKTOP)
// ============================================================

// 1 - IMPORTO REACT, REACT ROUTER, ÍCONOS, CONTEXTO Y MODAL:
import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, CreditCard, Wallet, LogOut, Settings, UserPlus, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from './Modal';

const BASE = '/api';
function getToken() { return localStorage.getItem('auth_token'); }

// 2 - FUNCIÓN PARA HACER REQUESTS AL BACKEND:
async function req(url, opts = {}) {
  const res = await fetch(`${BASE}${url}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...(opts.headers || {})
    }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// 3 - ÍTEMS SEGÚN ROL (SIN PERFIL, SE MUEVE AL DROPDOWN DE USUARIO):
const ADMIN_NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Resumen'   },
  { to: '/clientes',  icon: Users,           label: 'Clientes'  },
  { to: '/servicios', icon: Package,         label: 'Servicios' },
  { to: '/factura',   icon: CreditCard,      label: 'Facturas'  },
];
const CLIENT_NAV = [
  { to: '/mi-cuenta', icon: CreditCard, label: 'Mi Cuenta' },
];

// 4 - RENDERIZO LA BARRA SUPERIOR:
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const navItems          = user?.role === 'admin' ? ADMIN_NAV : CLIENT_NAV;

  // 5 - ESTADOS: DROPDOWN ABIERTO / MODAL NUEVO CLIENTE:
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalUser,    setModalUser]    = useState(false);
  const [formUser,     setFormUser]     = useState({ nombre: '', email: '', password: '' });
  const [guardando,    setGuardando]    = useState(false);
  const dropdownRef = useRef(null);

  // 6 - CIERRO EL DROPDOWN SI SE HACE CLICK AFUERA:
  useEffect(() => {
    function handleClickFuera(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  // 7 - LOGOUT: BORRO TOKEN Y VOY AL LOGIN:
  function handleLogout() { logout(); navigate('/login'); }

  // 8 - NAVEGO AL PERFIL Y CIERRO EL DROPDOWN:
  function handlePerfil() {
    setDropdownOpen(false);
    navigate('/perfil');
  }

  // 9 - ABRO EL MODAL DE NUEVO CLIENTE PORTAL Y CIERRO EL DROPDOWN:
  function handleAbrirModalCliente() {
    setDropdownOpen(false);
    setModalUser(true);
  }

  // 10 - CREO UN NUEVO CLIENTE CON USUARIO PORTAL:
  async function handleCrearCliente() {
    if (!formUser.nombre || !formUser.email || !formUser.password) {
      alert('Todos los campos son requeridos');
      return;
    }
    try {
      setGuardando(true);
      // 10a - LLAMO AL BACKEND PARA CREAR EL CLIENTE:
      await req('/portal/clients', { method: 'POST', body: JSON.stringify(formUser) });
      setModalUser(false);
      setFormUser({ nombre: '', email: '', password: '' });
      alert('Cliente portal creado con éxito');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
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

        {/* USUARIO CON DROPDOWN */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>

          {/* BOTÓN QUE MUESTRA EL EMAIL Y ABRE EL DROPDOWN */}
          <button
            onClick={() => setDropdownOpen(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.78rem', color: 'var(--text-secondary)',
              padding: '6px 8px', borderRadius: 'var(--radius-md)',
              transition: 'background 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </span>
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {/* POPUP DROPDOWN */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 8px)', right: 0,
              background: '#fff', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              minWidth: 200, zIndex: 1000, overflow: 'hidden'
            }}>

              {/* OPCIÓN 1 - PERFIL DEL PROVEEDOR */}
              <button
                onClick={handlePerfil}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '12px 16px', background: 'none',
                  border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                  color: 'var(--text-primary)', textAlign: 'left',
                  borderBottom: '1px solid var(--border-color)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <Settings size={16} color="var(--color-primary)" />
                Perfil del Proveedor
              </button>

              {/* OPCIÓN 2 - NUEVO CLIENTE PORTAL (solo admin) */}
              {user?.role === 'admin' && (
                <button
                  onClick={handleAbrirModalCliente}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '12px 16px', background: 'none',
                    border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                    color: 'var(--text-primary)', textAlign: 'left',
                    borderBottom: '1px solid var(--border-color)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <UserPlus size={16} color="var(--color-primary)" />
                  Nuevo cliente portal
                </button>
              )}

              {/* OPCIÓN 3 - CERRAR SESIÓN */}
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '12px 16px', background: 'none',
                  border: 'none', cursor: 'pointer', fontSize: '0.875rem',
                  color: '#EF4444', textAlign: 'left'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#FEF2F2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <LogOut size={16} color="#EF4444" />
                Cerrar sesión
              </button>

            </div>
          )}
        </div>

      </header>

      {/* MODAL: NUEVO CLIENTE PORTAL */}
      <Modal isOpen={modalUser} onClose={() => setModalUser(false)} title="Nuevo cliente portal">
        <div className="form-group">
          <label>Nombre *</label>
          <input
            value={formUser.nombre}
            onChange={e => setFormUser({ ...formUser, nombre: e.target.value })}
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            value={formUser.email}
            onChange={e => setFormUser({ ...formUser, email: e.target.value })}
            placeholder="juan@email.com"
          />
        </div>
        <div className="form-group">
          <label>Contraseña *</label>
          <input
            type="password"
            value={formUser.password}
            onChange={e => setFormUser({ ...formUser, password: e.target.value })}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setModalUser(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleCrearCliente} disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear cliente'}
          </button>
        </div>
      </Modal>
    </>
  );
}
