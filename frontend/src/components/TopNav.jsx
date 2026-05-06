// ============================================================
// COMPONENTE: BARRA DE NAVEGACIÓN SUPERIOR (SOLO DESKTOP)
// ============================================================

// 1 - IMPORTO REACT, REACT ROUTER, ÍCONOS, CONTEXTO Y MODAL:
import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Package, CreditCard, Wallet, LogOut, Settings, UserPlus, ChevronDown, Bell, CheckCheck, FileText, Eye, CheckCircle, X } from 'lucide-react';
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

  // 5 - ESTADOS:
  const [dropdownOpen,    setDropdownOpen]    = useState(false);
  const [modalUser,       setModalUser]       = useState(false);
  const [formUser,        setFormUser]        = useState({ nombre: '', email: '', password: '' });
  const [guardando,       setGuardando]       = useState(false);
  const [notifOpen,       setNotifOpen]       = useState(false);
  const [notificaciones,  setNotificaciones]  = useState([]);
  // ESTADO PARA EL MODAL DE DETALLE DE NOTIFICACIÓN:
  const [notifDetalle,    setNotifDetalle]    = useState(null);   // notificación seleccionada
  const [facturaDetalle,  setFacturaDetalle]  = useState(null);   // datos completos de la factura
  const [cargandoDetalle, setCargandoDetalle] = useState(false);  // loading del modal
  const [confirmando,     setConfirmando]     = useState(false);  // loading del btn confirmar
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

  // 6g - ABRO EL MODAL DE DETALLE CUANDO EL ADMIN HACE CLIC EN UNA NOTIFICACIÓN DE COMPROBANTE:
  async function handleClickNotif(n) {
    // Si es solo informativa (pago_confirmado u otra), la marco como leída y salgo:
    if (n.tipo !== 'comprobante_subido') {
      marcarUnaLeida(n.id);
      return;
    }

    // Es un comprobante → abro el modal con los detalles de la factura:
    setNotifDetalle(n);
    setNotifOpen(false);
    setCargandoDetalle(true);
    setFacturaDetalle(null);

    try {
      // 6g-1 - TRAIGO LOS DATOS COMPLETOS DE LA FACTURA:
      const factura = await req(`/facturas-portal/${n.factura_id}`);
      setFacturaDetalle(factura);
    } catch (err) {
      alert('No se pudieron cargar los datos de la factura');
      setNotifDetalle(null);
    } finally {
      setCargandoDetalle(false);
    }
  }

  // 6h - CONFIRMO EL PAGO DESDE EL MODAL DE NOTIFICACIÓN:
  async function handleConfirmarPago() {
    if (!facturaDetalle) return;
    if (!confirm(`¿Confirmar el pago de la factura #${String(facturaDetalle.id).padStart(4,'0')}?`)) return;

    try {
      setConfirmando(true);

      // 6h-1 - MARCO LA FACTURA COMO PAGADA EN EL BACKEND:
      await req(`/facturas-portal/${facturaDetalle.id}/pagar`, { method: 'PUT' });

      // 6h-2 - MARCO LA NOTIFICACIÓN COMO LEÍDA:
      await marcarUnaLeida(notifDetalle.id);

      // 6h-3 - ACTUALIZO EL FACTURADETALLE LOCALMENTE PARA MOSTRAR ESTADO PAGADO:
      setFacturaDetalle(prev => ({ ...prev, estado: 'pagado' }));

      // 6h-4 - DISPARO UN EVENTO GLOBAL PARA QUE FACTURA.JSX SE RECARGUE:
      window.dispatchEvent(new CustomEvent('factura-actualizada'));

      // 6h-5 - CIERRO EL MODAL DESPUÉS DE 1.5 SEGUNDOS:
      setTimeout(() => {
        setNotifDetalle(null);
        setFacturaDetalle(null);
      }, 1500);

    } catch (err) {
      alert('Error al confirmar el pago: ' + err.message);
    } finally {
      setConfirmando(false);
    }
  }

  // 6i - FUNCIÓN DE FORMATO DE PERÍODO:
  function fmtPeriodo(p) {
    if (!p) return '';
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const [anio, mes] = p.split('-');
    return mes ? `${meses[parseInt(mes)]} ${anio}` : anio;
  }

  // 6j - FUNCIÓN DE FORMATO DE MONTO:
  const fmt = (m) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(m);

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
                          {/* INDICACIÓN CLICKEABLE SOLO PARA comprobante_subido */}
                          {n.tipo === 'comprobante_subido' && !n.leida && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-primary)', fontWeight: 600, marginTop: 2, display: 'block' }}>
                              👆 Clic para ver y confirmar
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

        </div>{/* FIN ZONA DERECHA */}

      </header>

      {/* ── MODAL: DETALLE DE COMPROBANTE DE PAGO ── */}
      <Modal
        isOpen={!!notifDetalle}
        onClose={() => { setNotifDetalle(null); setFacturaDetalle(null); }}
        title="📎 Comprobante de pago recibido"
      >
        {cargandoDetalle ? (
          /* ESTADO DE CARGA */
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-tertiary)' }}>
            <p>Cargando datos de la factura...</p>
          </div>

        ) : facturaDetalle ? (
          <>
            {/* ── ESTADO CONFIRMADO ── */}
            {facturaDetalle.estado === 'pagado' && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#F0FDF4', border: '1.5px solid #22C55E',
                borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 16
              }}>
                <CheckCircle size={20} color="#22C55E" />
                <span style={{ fontWeight: 700, color: '#15803D', fontSize: '0.9rem' }}>
                  ✅ Pago confirmado correctamente
                </span>
              </div>
            )}

            {/* ── DATOS DEL CLIENTE ── */}
            <div style={{
              background: 'var(--bg-main)', borderRadius: 'var(--radius-lg)',
              padding: '16px', marginBottom: 16, border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 10, letterSpacing: '0.06em' }}>
                Datos del cliente
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* FOTO */}
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#EDE9FE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden', flexShrink: 0
                }}>
                  {facturaDetalle.cliente_foto
                    ? <img src={`http://localhost:3001${facturaDetalle.cliente_foto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <FileText size={20} color="#7C3AED" />
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {facturaDetalle.nombre_display || facturaDetalle.razon_social || '—'}
                  </div>
                  {facturaDetalle.cliente_email && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      {facturaDetalle.cliente_email}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── DATOS DE LA FACTURA ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Factura',  valor: `#${String(facturaDetalle.id).padStart(4, '0')}` },
                { label: 'Período',  valor: fmtPeriodo(facturaDetalle.periodo) },
                { label: 'Total',    valor: fmt(facturaDetalle.total) },
              ].map(({ label, valor }) => (
                <div key={label} style={{
                  background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
                  padding: '12px', border: '1px solid var(--border-color)', textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-primary)' }}>{valor}</div>
                </div>
              ))}
            </div>

            {/* ── COMPROBANTE ADJUNTO ── */}
            <div style={{
              background: '#F5F3FF', border: '1.5px solid var(--color-primary)',
              borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 20
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: 10, letterSpacing: '0.06em' }}>
                Comprobante adjunto
              </div>
              {facturaDetalle.comprobante ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    📄
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {facturaDetalle.comprobante.split('/').pop()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                      Subido por el cliente
                    </div>
                  </div>
                  {/* BOTÓN VER COMPROBANTE */}
                  <button
                    onClick={() => window.open(`http://localhost:3001${facturaDetalle.comprobante}`, '_blank')}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-primary)', background: 'transparent',
                      color: 'var(--color-primary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    <Eye size={14} /> Ver archivo
                  </button>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                  Sin comprobante adjunto
                </p>
              )}
            </div>

            {/* ── ACCIONES ── */}
            <div className="modal-actions">
              <button
                className="btn btn-ghost"
                onClick={() => { setNotifDetalle(null); setFacturaDetalle(null); }}
              >
                Cerrar
              </button>
              {facturaDetalle.estado !== 'pagado' && (
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmarPago}
                  disabled={confirmando || !facturaDetalle.comprobante}
                  style={{ gap: 8 }}
                >
                  <CheckCircle size={15} />
                  {confirmando ? 'Confirmando...' : 'Confirmar pago'}
                </button>
              )}
            </div>
          </>
        ) : null}
      </Modal>

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
