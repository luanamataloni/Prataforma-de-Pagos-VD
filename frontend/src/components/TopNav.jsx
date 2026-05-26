// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN SUPERIOR (SOLO DESKTOP)
// ============================================================

// 1 - IMPORTO REACT, REACT ROUTER, ÍCONOS, CONTEXTO Y MODAL:
import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, Package, CreditCard, Wallet, LogOut, Settings, UserPlus, ChevronDown, Bell, CheckCheck } from 'lucide-react';
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
// ADMIN: Facturas (home) → Clientes → Servicios (sin Resumen)
const ADMIN_NAV = [
  { to: '/',          icon: CreditCard, label: 'Facturas'  },
  { to: '/clientes',  icon: Users,      label: 'Clientes'  },
  { to: '/servicios', icon: Package,    label: 'Servicios' },
];
const CLIENT_NAV = [
  { to: '/mi-cuenta', icon: CreditCard, label: 'Mi Cuenta' },
];

// 4 - RENDERIZO LA BARRA SUPERIOR:
export default function TopNav() {
  const { user, logout } = useAuth();
  const navigate          = useNavigate();
  const navItems          = user?.role === 'admin' ? ADMIN_NAV : CLIENT_NAV;

  // 5 - ESTADOS:
  const [dropdownOpen,   setDropdownOpen]   = useState(false);
  const [modalUser,      setModalUser]      = useState(false);
  const [formUser,       setFormUser]       = useState({ nombre: '', email: '', password: '' });
  const [guardando,      setGuardando]      = useState(false);
  const [notifOpen,      setNotifOpen]      = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const dropdownRef = useRef(null);
  const notifRef    = useRef(null);

  // 6 - CIERRO EL DROPDOWN SI SE HACE CLICK AFUERA:
  useEffect(() => {
    function handleClickFuera(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  // 6b - CARGO NOTIFICACIONES AL MONTAR Y CADA 30 SEGUNDOS:
  useEffect(() => {
    cargarNotificaciones();
    const intervalo = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(intervalo);
  }, []);

  // 6c - FUNCIÓN PARA CARGAR NOTIFICACIONES DEL BACKEND:
  async function cargarNotificaciones() {
    try {
      const token = localStorage.getItem('auth_token');
      const res   = await fetch('/api/notificaciones', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      // Silencioso: no crítico
    }
  }

  // 6d - MARCO TODAS COMO LEÍDAS:
  async function marcarTodasLeidas() {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/notificaciones/leer-todas', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: 1 })));
    } catch (err) { /* silencioso */ }
  }

  // 6e - MARCO UNA NOTIFICACIÓN COMO LEÍDA:
  async function marcarUnaLeida(id) {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/notificaciones/${id}/leer`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: 1 } : n));
    } catch (err) { /* silencioso */ }
  }

  // 6f - CUENTO LAS NO LEÍDAS:
  const noLeidas = notificaciones.filter(n => !n.leida).length;

  // 6g - CUANDO EL ADMIN HACE CLIC EN UNA NOTIFICACIÓN → NAVEGO A FACTURAS Y RESALTO LA FACTURA:
  function handleClickNotif(n) {
    // 6g-1 - MARCO LA NOTIFICACIÓN COMO LEÍDA:
    marcarUnaLeida(n.id);

    // 6g-2 - CIERRO EL PANEL DE NOTIFICACIONES:
    setNotifOpen(false);

    // 6g-3 - NAVEGO A LA PÁGINA DE FACTURAS CON EL ID DE LA FACTURA PARA RESALTARLA:
    if (n.factura_id) {
      navigate('/facturas-admin', { state: { highlightId: n.factura_id } });
    }
  }

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


  // 11 - DETENGO LA PROPAGACIÓN PARA QUE EL DROPDOWN NO SE CIERRE AL HACER CLICK DENTRO DEL MODAL:
  const handleModalClick = (e) => {
    e.stopPropagation();
  };

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

        {/* ZONA DERECHA: CAMPANA + USUARIO */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* ── CAMPANA DE NOTIFICACIONES ── */}
          <div ref={notifRef} style={{ position: 'relative' }}>

            {/* BOTÓN CAMPANA CON BADGE */}
            <button
              onClick={() => { setNotifOpen(v => !v); if (!notifOpen) cargarNotificaciones(); }}
              style={{
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: 'var(--radius-md)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: noLeidas > 0 ? 'var(--color-primary)' : 'var(--text-tertiary)',
                transition: 'background 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              title="Notificaciones"
            >
              <Bell size={18} />
              {/* BADGE CON CANTIDAD DE NO LEÍDAS */}
              {noLeidas > 0 && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  background: '#EF4444', color: '#fff',
                  borderRadius: '50%', width: 16, height: 16,
                  fontSize: '0.6rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1, border: '2px solid #fff'
                }}>
                  {noLeidas > 9 ? '9+' : noLeidas}
                </span>
              )}
            </button>

            {/* DROPDOWN DE NOTIFICACIONES */}
            {notifOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 1000,
                background: '#fff', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                width: 360, maxHeight: 460, display: 'flex', flexDirection: 'column',
                overflow: 'hidden'
              }}>

                {/* CABECERA DEL PANEL */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderBottom: '1px solid var(--border-color)'
                }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    🔔 Notificaciones
                  </span>
                  {noLeidas > 0 && (
                    <button
                      onClick={marcarTodasLeidas}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600
                      }}
                    >
                      <CheckCheck size={14} /> Marcar todas como leídas
                    </button>
                  )}
                </div>

                {/* LISTA DE NOTIFICACIONES */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {notificaciones.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                      <Bell size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                      <p>Sin notificaciones</p>
                    </div>
                  ) : (
                    notificaciones.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleClickNotif(n)}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 10,
                          padding: '12px 16px', cursor: 'pointer',
                          background: n.leida ? 'transparent' : '#F5F3FF',
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                        onMouseLeave={e => e.currentTarget.style.background = n.leida ? 'transparent' : '#F5F3FF'}
                      >
                        <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 2 }}>
                          {n.tipo === 'comprobante_subido' ? '📎' : '✅'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4, fontWeight: n.leida ? 400 : 600 }}>
                            {n.mensaje}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 3, display: 'block' }}>
                            {new Date(n.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {/* INDICACIÓN CLICKEABLE PARA TODAS LAS NOTIFICACIONES NO LEÍDAS */}
                          {!n.leida && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: 2, display: 'block' }}>
                              👆 Clic para ir a la factura
                            </span>
                          )}
                        </div>
                        {/* PUNTO AZUL SI NO LEÍDA */}
                        {!n.leida && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 6 }} />
                        )}
                      </div>
                    ))
                  )}
                </div>

              </div>
            )}
          </div>

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

                {/* OPCIÓN 1 - PERFIL DEL PROVEEDOR (solo admin) */}
                {user?.role === 'admin' && (
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
                )}

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

        </div>{/* FIN ZONA DERECHA */}

      </header>


      {/* MODAL: NUEVO CLIENTE PORTAL */}
      <div onClick={handleModalClick}>
        <Modal isOpen={modalUser} onClose={() => setModalUser(false)} title="Nuevo cliente portal">
          <div className="form-group">
            <label>Nombre *</label>
            <input
              value={formUser.nombre}
              onChange={e => setFormUser({ ...formUser, nombre: e.target.value })}
              placeholder="Ej: Juan Pérez"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              value={formUser.email}
              onChange={e => setFormUser({ ...formUser, email: e.target.value })}
              placeholder="juan@email.com"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="form-group">
            <label>Contraseña *</label>
            <input
              type="password"
              value={formUser.password}
              onChange={e => setFormUser({ ...formUser, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModalUser(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleCrearCliente} disabled={guardando}>
              {guardando ? 'Creando...' : 'Crear cliente'}
            </button>
          </div>
        </Modal>
      </div>
    </>
  );
}
