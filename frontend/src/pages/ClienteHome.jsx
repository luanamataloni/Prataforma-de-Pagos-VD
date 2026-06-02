// ============================================================
// PÁGINA: MI CUENTA - VISTA DEL CLIENTE (todas sus facturas)
// ============================================================

// 1 - IMPORTO REACT, CONTEXTO Y ÍCONOS:
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, Clock, FileText, Eye, Paperclip, ChevronDown, ChevronUp, Send, Hourglass, X } from 'lucide-react';

const BASE = '/api';
function getToken() { return localStorage.getItem('auth_token'); }

export default function ClienteHome() {
  const { user, client } = useAuth();
  const [facturas,        setFacturas]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [expandida,       setExpandida]       = useState(null);
  const [archivos,        setArchivos]        = useState({});
  const [subiendo,        setSubiendo]        = useState({});
  // NOTIFICACIONES NO LEÍDAS PARA EL BANNER:
  const [notifPendientes, setNotifPendientes] = useState([]);

  // 2 - CARGO FACTURAS Y NOTIFICACIONES AL MONTAR:
  useEffect(() => {
    cargarFacturas();
    cargarNotificaciones();
  }, []);

  async function cargarFacturas() {
    try {
      setLoading(true);
      const res  = await fetch(`${BASE}/facturas-portal`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const json = await res.json();
      setFacturas(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error('Error al cargar facturas:', err);
    } finally {
      setLoading(false);
    }
  }

  // 2b - CARGO LAS NOTIFICACIONES NO LEÍDAS DEL TIPO 'pago_confirmado':
  async function cargarNotificaciones() {
    try {
      const res  = await fetch(`${BASE}/notificaciones`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        // 2c - FILTRO SOLO LAS NO LEÍDAS DE TIPO pago_confirmado:
        const sinLeer = (Array.isArray(data) ? data : []).filter(n => !n.leida && n.tipo === 'pago_confirmado');
        setNotifPendientes(sinLeer);
      }
    } catch (err) { /* silencioso */ }
  }

  // 3 - DESCARTO UN BANNER DE NOTIFICACIÓN Y LO MARCO COMO LEÍDO:
  async function descartarNotif(id) {
    try {
      await fetch(`${BASE}/notificaciones/${id}/leer`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      setNotifPendientes(prev => prev.filter(n => n.id !== id));
    } catch (err) { /* silencioso */ }
  }

  // 4 - ABRO EL PDF EN NUEVA PESTAÑA:
  function handleVerPDF(id) {
    window.open(`/api/facturas-portal/${id}/html`, '_blank');
  }

  // 5 - GUARDO EL ARCHIVO SELECCIONADO PARA UNA FACTURA ESPECÍFICA:
  function handleSeleccionarArchivo(facturaId, file) {
    if (!file) return;
    setArchivos(prev => ({ ...prev, [facturaId]: file }));
  }

  // 6 - SUBO EL COMPROBANTE AL SERVIDOR:
  // El cliente ya NO marca como pagada - eso lo hace el administrador.
  async function handleSubirComprobante(facturaId) {
    const archivo = archivos[facturaId];
    if (!archivo) { alert('Seleccioná un comprobante primero'); return; }
    if (!confirm('¿Confirmar el envío del comprobante al administrador?')) return;

    try {
      setSubiendo(prev => ({ ...prev, [facturaId]: true }));

      // 6a - SUBO EL ARCHIVO AL SERVIDOR:
      const formData = new FormData();
      formData.append('comprobante', archivo);
      const uploadRes = await fetch(`${BASE}/factura/portal/${facturaId}/upload`, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body:    formData
      });
      if (!uploadRes.ok) throw new Error('Error al subir el comprobante');

      // 6b - LIMPIO EL ARCHIVO LOCAL Y RECARGO LAS FACTURAS:
      setArchivos(prev => { const n = { ...prev }; delete n[facturaId]; return n; });
      cargarFacturas();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubiendo(prev => ({ ...prev, [facturaId]: false }));
    }
  }

  // 7 - FORMATEOS:
  const fmt = (m) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(m);

  const fmtPeriodo = (p) => {
    if (!p) return '';
    const [year, month] = p.split('-');
    if (!month) return p;
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${meses[parseInt(month) - 1]} ${year}`;
  };

  if (loading) return <div className="empty-state"><p>Cargando...</p></div>;

  // 8 - RENDERIZO LA PÁGINA:
  return (
    <>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Hola, {client?.nombre || user?.email} 👋</h1>
        <p>Aquí podés ver todas tus facturas y sus estados</p>
      </div>

      {/* ── ESTILOS RESPONSIVE PARA EL LISTADO DE FACTURAS ── */}
      <style>{`
        /* 1 - ENCABEZADO DE COLUMNAS: solo visible en desktop */
        .cl-header    { display: flex; }
        /* 2 - FILA DESKTOP: columnas fijas horizontales */
        .cl-row-desk  { display: flex; }
        /* 3 - FILA MOBILE: tarjeta apilada (oculta en desktop) */
        .cl-row-mob   { display: none; }

        @media (max-width: 640px) {
          .cl-header    { display: none; }
          .cl-row-desk  { display: none; }
          .cl-row-mob   { display: block; }
        }
      `}</style>

      {/* ── BANNERS DE NOTIFICACIÓN DE PAGO CONFIRMADO ── */}
      {notifPendientes.map(n => (
        <div key={n.id} style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          background: '#F0FDF4', border: '1.5px solid #22C55E',
          borderRadius: 'var(--radius-lg)', padding: '14px 18px',
          marginBottom: 12, animation: 'slideUp 0.2s ease'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>✅</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#15803D' }}>
                ¡Pago confirmado!
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#16A34A', marginTop: 2 }}>
                {n.mensaje.replace('✅ ', '')}
              </p>
            </div>
          </div>
          {/* BOTÓN DESCARTAR */}
          <button
            onClick={() => descartarNotif(n.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16A34A', padding: 4 }}
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>
      ))}

      {/* ESTADO VACÍO */}
      {facturas.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 24 }}>
          <div className="es-icon"><FileText size={28} /></div>
          <h3>Sin facturas aún</h3>
          <p>Todavía no tenés facturas generadas.<br />Contactá a tu administrador.</p>
        </div>
      ) : (
        <div style={{ paddingBottom: 40 }}>

          {/* ENCABEZADO DE COLUMNAS (solo desktop) */}
          <div className="cl-header" style={{
            alignItems: 'center', padding: '0 20px 10px',
            fontSize: '0.75rem', fontWeight: 700,
            color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            <div style={{ flex: 1 }}>Factura</div>
            <div style={{ width: 120, textAlign: 'center' }}>Periodo</div>
            <div style={{ width: 110, textAlign: 'center' }}>Monto</div>
            <div style={{ width: 140, textAlign: 'center' }}>Comprobante</div>
            <div style={{ width: 130, textAlign: 'center' }}>Estado</div>
            <div style={{ width: 50,  textAlign: 'right' }}>Ver más</div>
          </div>

          {/* LISTA DE FACTURAS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {facturas.map(f => {
              const archivoSeleccionado = archivos[f.id] || null;
              const estaSubiendo        = subiendo[f.id]  || false;
              // ESTADO DEL COMPROBANTE: pendiente sin archivo / enviado / pagada:
              const comprobanteEnviado  = f.comprobante && f.estado === 'pendiente';

              // HELPER: RENDERIZA EL BOTÓN O ESTADO DEL COMPROBANTE
              // Se reutiliza tanto en la versión desktop como en la mobile:
              const renderBotonComprobante = () => {

                // CASO A - FACTURA PAGADA: mostrar botón para ver PDF:
                if (f.estado === 'pagado') {
                  return (
                    <button onClick={() => handleVerPDF(f.id)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 14px', borderRadius: 'var(--radius-full)',
                      border: '1.5px solid var(--color-primary)', background: 'transparent',
                      color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600,
                      cursor: 'pointer', whiteSpace: 'nowrap'
                    }}>
                      <Eye size={13} /> Ver PDF
                    </button>
                  );
                }

                // CASO B - COMPROBANTE YA ENVIADO: esperando revisión del admin:
                if (comprobanteEnviado) {
                  return (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 12px', borderRadius: 'var(--radius-full)',
                      background: '#FEF9C3', color: '#92400E',
                      fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap'
                    }}>
                      <Hourglass size={12} /> En revisión
                    </span>
                  );
                }

                // CASO C - ARCHIVO SELECCIONADO: botón para enviar:
                if (archivoSeleccionado) {
                  return (
                    <button onClick={() => handleSubirComprobante(f.id)} disabled={estaSubiendo} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 14px', borderRadius: 'var(--radius-full)',
                      border: 'none', background: '#22C55E',
                      color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                      cursor: estaSubiendo ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
                      opacity: estaSubiendo ? 0.7 : 1
                    }}>
                      <Send size={13} /> {estaSubiendo ? '...' : 'Enviar'}
                    </button>
                  );
                }

                // CASO D - SIN ARCHIVO: label para seleccionar comprobante:
                return (
                  <label style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 14px', borderRadius: 'var(--radius-full)',
                    border: '1.5px solid #D1D5DB', background: '#F9FAFB',
                    color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
                    cursor: 'pointer', whiteSpace: 'nowrap'
                  }}>
                    <Paperclip size={13} /> Subir
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={e => handleSeleccionarArchivo(f.id, e.target.files[0])}
                    />
                  </label>
                );
              };

              return (
                <div key={f.id} className="card card-sm" style={{ padding: 0, overflow: 'hidden' }}>

                  {/* ──── VERSIÓN DESKTOP: columnas horizontales fijas ──── */}
                  <div className="cl-row-desk" style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 0 }}>

                    {/* COLUMNA CLIENTE: foto + nombre + nro */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: '#EDE9FE', border: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                      }}>
                        {f.cliente_foto
                          ? <img src={`http://localhost:3001${f.cliente_foto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <FileText size={18} color="#7C3AED" />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.nombre_display || client?.nombre || user?.email}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          Factura #{String(f.id).padStart(4, '0')}
                        </div>
                      </div>
                    </div>

                    {/* COLUMNA PERIODO */}
                    <div style={{ width: 120, textAlign: 'center' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--color-blue)' }}>
                        {fmtPeriodo(f.periodo)}
                      </span>
                    </div>

                    {/* COLUMNA MONTO */}
                    <div style={{ width: 110, textAlign: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-primary)' }}>
                        {fmt(f.total)}
                      </span>
                    </div>

                    {/* COLUMNA COMPROBANTE */}
                    <div style={{ width: 140, display: 'flex', justifyContent: 'center' }}>
                      {renderBotonComprobante()}
                    </div>

                    {/* COLUMNA ESTADO */}
                    <div style={{ width: 130, display: 'flex', justifyContent: 'center' }}>
                      <span className={`badge-pago status-${f.estado}`} style={{ margin: 0 }}>
                        {f.estado === 'pagado'
                          ? <><CheckCircle size={12} /> Pagada</>
                          : <><Clock size={12} /> Pendiente</>}
                      </span>
                    </div>

                    {/* COLUMNA VER MÁS */}
                    <div
                      style={{ width: 50, display: 'flex', justifyContent: 'flex-end', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                      onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                    >
                      {expandida === f.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* ──── VERSIÓN MOBILE: tarjeta apilada en filas ──── */}
                  <div className="cl-row-mob">

                    {/* FILA 1: foto + nombre + nro + chevron (toda la fila es clickeable) */}
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
                      onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        background: '#EDE9FE', border: '1px solid #e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                      }}>
                        {f.cliente_foto
                          ? <img src={`http://localhost:3001${f.cliente_foto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <FileText size={18} color="#7C3AED" />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.nombre_display || client?.nombre || user?.email}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                          Factura #{String(f.id).padStart(4, '0')}
                        </div>
                      </div>
                      {expandida === f.id
                        ? <ChevronUp size={18} color="var(--text-tertiary)" />
                        : <ChevronDown size={18} color="var(--text-tertiary)" />}
                    </div>

                    {/* FILA 2: periodo + monto + estado en chips */}
                    <div style={{
                      display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8,
                      padding: '0 16px 10px', paddingLeft: 68
                    }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-blue)' }}>
                        {fmtPeriodo(f.periodo)}
                      </span>
                      <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                        {fmt(f.total)}
                      </span>
                      <span className={`badge-pago status-${f.estado}`} style={{ margin: 0 }}>
                        {f.estado === 'pagado'
                          ? <><CheckCircle size={12} /> Pagada</>
                          : <><Clock size={12} /> Pendiente</>}
                      </span>
                    </div>

                    {/* FILA 3: botón de comprobante */}
                    <div style={{ padding: '0 16px 14px', paddingLeft: 68 }}>
                      {renderBotonComprobante()}
                    </div>

                  </div>

                  {/* NOMBRE DEL ARCHIVO SELECCIONADO (visible en ambos layouts) */}
                  {archivoSeleccionado && f.estado === 'pendiente' && !f.comprobante && (
                    <div style={{
                      borderTop: '1px dashed var(--border-color)',
                      padding: '6px 20px', background: '#F0FDF4',
                      fontSize: '0.75rem', color: '#15803D', display: 'flex', alignItems: 'center', gap: 6
                    }}>
                      <Paperclip size={12} />
                      <span style={{ fontWeight: 600 }}>{archivoSeleccionado.name}</span>
                      <span style={{ color: 'var(--text-tertiary)' }}>— Listo para enviar</span>
                      <button
                        onClick={() => setArchivos(prev => { const n = { ...prev }; delete n[f.id]; return n; })}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '0.75rem' }}
                      >
                        ✕ Quitar
                      </button>
                    </div>
                  )}

                  {/* PANEL EXPANDIDO: DETALLE DE ÍTEMS (visible en ambos layouts) */}
                  {expandida === f.id && (
                    <div style={{ borderTop: '1px solid var(--border-color)', background: '#FAFAFA' }}>
                      {f.detalle?.length > 0 ? (
                        <div style={{ padding: '12px 20px' }}>
                          {f.detalle.map(item => (
                            <div key={item.id} style={{
                              display: 'flex', justifyContent: 'space-between',
                              alignItems: 'flex-start', padding: '8px 0',
                              borderBottom: '1px dashed var(--border-color)', gap: 8
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.88rem' }}>
                                  {item.descripcion}
                                </span>
                                <div style={{ color: 'var(--text-tertiary)', fontSize: '0.74rem', marginTop: 2 }}>
                                  {item.cantidad} × {fmt(item.importe)}
                                </div>
                              </div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', fontSize: '0.88rem' }}>
                                {fmt(item.importe * item.cantidad)}
                              </div>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 10, fontWeight: 800, color: 'var(--color-primary)' }}>
                            Total: {fmt(f.total)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '12px 20px', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                          Sin ítems de detalle.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
