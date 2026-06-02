// ============================================================
// PÁGINA: FACTURAS - GESTIÓN COMPLETA DE FACTURACIÓN
// ============================================================

// 1 - IMPORTO REACT, ÍCONOS Y MODAL:
import { useState, useEffect, useRef } from 'react';
import {
  Plus, FileText, ChevronDown, ChevronUp,
  Trash2, Printer, Zap, CheckCircle, Clock, Calendar, Eye, Paperclip, Mail
} from 'lucide-react';
import Modal from '../components/Modal';

// 2 - HELPER: REQUEST AUTENTICADO AL BACKEND:
const BASE = '/api';
function getToken() { return localStorage.getItem('auth_token'); }
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

const ITEM_VACIO = { descripcion: '', cantidad: 1, importe: '' };
const FORM_VACIO = {
  client_id:      '',
  cliente_adm_id: '',
  periodo:        new Date().toISOString().slice(0, 7),
  detalle:        [{ ...ITEM_VACIO }]
};

export default function Facturas() {

  // 3 - ESTADOS:
  const [facturas,         setFacturas]         = useState([]);
  const [clients,          setClients]          = useState([]);
  const [clientesAdm,      setClientesAdm]      = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [modal,            setModal]            = useState(false);
  const [modalGenerar,     setModalGenerar]     = useState(false);
  const [guardando,        setGuardando]        = useState(false);
  const [generando,        setGenerando]        = useState(false);
  const [expandida,        setExpandida]        = useState(null);
  const [form,             setForm]             = useState({ ...FORM_VACIO });
  const [periodoGenerar,   setPeriodoGenerar]   = useState(new Date().toISOString().slice(0, 7));
  const [resultadoGen,     setResultadoGen]     = useState(null);
  const [filtroEstado,     setFiltroEstado]     = useState('todos');
  // FILTRO DE PERÍODO ACTIVO (null = todos los períodos):
  const [periodoFiltro,    setPeriodoFiltro]    = useState(null);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const pickerRef = useRef(null);

  // NUEVOS ESTADOS PARA SUBIR COMPROBANTE (Admin):
  const [archivos,  setArchivos]  = useState({});
  const [subiendo,  setSubiendo]  = useState({});

  // ESTADO PARA ENVÍO DE MAIL POR FACTURA:
  const [enviandoMail, setEnviandoMail] = useState({});
  const [mailEnviado, setMailEnviado] = useState({});

  // 4 - CARGO DATOS AL MONTAR:
  useEffect(() => { cargarDatos(); }, []);

  // 4c - ESCUCHO EL EVENTO GLOBAL QUE DISPARA TOPNAV CUANDO EL ADMIN CONFIRMA UN PAGO:
  // Así la lista se actualiza automáticamente sin que el usuario recargue la página.
  useEffect(() => {
    function onFacturaActualizada() { cargarDatos(); }
    window.addEventListener('factura-actualizada', onFacturaActualizada);
    return () => window.removeEventListener('factura-actualizada', onFacturaActualizada);
  }, []);

  // 4b - CIERRA EL PICKER SI SE HACE CLICK FUERA:
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPeriodPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function cargarDatos() {
    try {
      setLoading(true);

      // 4a - TRAIGO FACTURAS, CLIENTES PORTAL Y CLIENTES ADMIN EN PARALELO:
      const [f, c, ca] = await Promise.all([
        req('/facturas-portal'),
        req('/portal/clients'),
        req('/clientes')
      ]);
      setFacturas(f);
      setClients(c);
      setClientesAdm(ca);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  }

  // 5 - CUANDO SE SELECCIONA CLIENTE ADMIN, AUTO-CARGO SUS SERVICIOS EN EL FORM:
  async function cargarServiciosDeCliente(clienteAdmId) {
    if (!clienteAdmId) {
      setForm(f => ({ ...f, cliente_adm_id: '', detalle: [{ ...ITEM_VACIO }] }));
      return;
    }
    try {
      // 5a - BUSCO EL CLIENTE CON SUS SERVICIOS:
      const cliente = await req(`/clientes/${clienteAdmId}`);
      const detalleCargado = (cliente.servicios || []).map(s => ({
        descripcion: s.nombre,
        cantidad:    1,
        importe:     s.precio
      }));

      // 5b - SI TIENE SERVICIOS LOS PRECARGO, SINO DEJO UN ÍTEM VACÍO:
      setForm(f => ({
        ...f,
        cliente_adm_id: clienteAdmId,
        detalle: detalleCargado.length > 0 ? detalleCargado : [{ ...ITEM_VACIO }]
      }));
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      setForm(f => ({ ...f, cliente_adm_id: clienteAdmId }));
    }
  }

  // 6 - AGREGO / QUITO / EDITO ÍTEMS DEL DETALLE:
  const agregarItem = () => setForm({ ...form, detalle: [...form.detalle, { ...ITEM_VACIO }] });
  const quitarItem  = (i) => setForm({ ...form, detalle: form.detalle.filter((_, idx) => idx !== i) });
  const updateItem  = (i, field, val) => {
    const d = [...form.detalle];
    d[i] = { ...d[i], [field]: val };
    setForm({ ...form, detalle: d });
  };

  // 7 - TOTAL DINÁMICO DEL FORMULARIO:
  const totalForm = form.detalle.reduce((s, it) => s + (Number(it.cantidad) * Number(it.importe) || 0), 0);

  // 8 - GUARDO UNA FACTURA MANUAL:
  async function handleGuardar() {
    if ((!form.client_id && !form.cliente_adm_id) || !form.periodo) {
      alert('Seleccioná un cliente y un período');
      return;
    }
    try {
      setGuardando(true);

      // 8a - ENVÍO LA FACTURA CON SU DETALLE AL BACKEND:
      await req('/facturas-portal', {
        method: 'POST',
        body: JSON.stringify({
          client_id:      form.client_id      ? parseInt(form.client_id)      : null,
          cliente_adm_id: form.cliente_adm_id ? parseInt(form.cliente_adm_id) : null,
          periodo:        form.periodo,
          detalle:        form.detalle
            .filter(i => i.descripcion && i.importe)
            .map(i => ({
              descripcion: i.descripcion,
              cantidad:    parseInt(i.cantidad),
              importe:     parseFloat(i.importe)
            }))
        })
      });
      setModal(false);
      setForm({ ...FORM_VACIO });
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  // 9 - GENERO FACTURAS PARA TODO UN PERÍODO DE UN CLICK:
  async function handleGenerarPeriodo() {
    if (!periodoGenerar) { alert('Seleccioná un período'); return; }
    try {
      setGenerando(true);
      setResultadoGen(null);

      // 9a - LLAMO AL ENDPOINT QUE GENERA UNA FACTURA POR CADA CLIENTE:
      const resultado = await req('/facturas-portal/generar-periodo', {
        method: 'POST',
        body: JSON.stringify({ periodo: periodoGenerar })
      });
      setResultadoGen(resultado);
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGenerando(false);
    }
  }

  // 10 - ELIMINO UNA FACTURA:
  async function handleEliminar(id, nombre) {
    if (!confirm(`¿Eliminar la factura de ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await req(`/facturas-portal/${id}`, { method: 'DELETE' });
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 11 - MARCO UNA FACTURA COMO PAGADA:
  async function handleMarcarPagado(facturaId, comprobanteExistente) {
    const archivoLocal = archivos[facturaId];
    if (!archivoLocal && !comprobanteExistente) {
      alert('Para marcar como pagada, debés cargar el comprobante primero en la columna Archivo.');
      return;
    }
    if (!confirm('¿Marcar factura como pagada con el comprobante seleccionado?')) return;

    try {
      setSubiendo(prev => ({ ...prev, [facturaId]: true }));

      // 11a - SI HAY UN ARCHIVO NUEVO, LO SUBO; SI YA EXISTE, SIGO DIRECTO:
      if (archivoLocal) {
        const formData = new FormData();
        formData.append('comprobante', archivoLocal);
        const uploadRes = await fetch(`${BASE}/factura/portal/${facturaId}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${getToken()}` },
          body: formData
        });
        if (!uploadRes.ok) throw new Error('Error al subir el comprobante');
      }

      // 11b - MARCO COMO PAGADA:
      await req(`/facturas-portal/${facturaId}/pagar`, { method: 'PUT' });

      // 11c - LIMPIO Y RECARGO:
      setArchivos(prev => { const n = { ...prev }; delete n[facturaId]; return n; });
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubiendo(prev => ({ ...prev, [facturaId]: false }));
    }
  }

  // 12 - ABRO EL HTML DE LA FACTURA EN NUEVA PESTAÑA PARA IMPRIMIR / PDF:
  function handleImprimir(id) {
    window.open(`/api/facturas-portal/${id}/html`, '_blank');
  }

  // 12b - ENVÍO EL MAIL DE LA FACTURA AL CLIENTE:
  async function handleEnviarMail(facturaId, nombreCliente) {
    if (!confirm(`¿Enviar mail con la factura a ${nombreCliente}?`)) return;
    try {
      setEnviandoMail(prev => ({ ...prev, [facturaId]: true }));

      // 12b-1 - LLAMO AL ENDPOINT QUE ENVÍA EL MAIL:
      const res = await fetch(`${BASE}/facturas-portal/${facturaId}/enviar-mail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar el mail');

      // 12b-2 - MARCO EL BOTÓN COMO ENVIADO:
      setMailEnviado(prev => ({ ...prev, [facturaId]: true }));

      alert(`✅ ${data.mensaje}`);
    } catch (err) {
      alert('❌ ' + err.message);
    } finally {
      setEnviandoMail(prev => ({ ...prev, [facturaId]: false }));
    }
  }

  // 13 - ABRO EL COMPROBANTE SUBIDO (si existe):
  function handleVerComprobante(nombreArchivo) {
    if (!nombreArchivo) return;

    // 13a - NORMALIZO LA RUTA PARA EVITAR DOBLE /uploads/ EN REGISTROS ANTIGUOS:
    const ruta = nombreArchivo.startsWith('/uploads/')
      ? nombreArchivo
      : `/uploads/${nombreArchivo}`;

    window.open(`http://localhost:3001${ruta}`, '_blank');
  }

  // 14 - FORMATEOS:
  const fmt = (m) => new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0
  }).format(m);

  const fmtPeriodo = (p) => {
    if (!p) return '';
    const [y, m] = p.split('-');
    const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return m ? `${meses[parseInt(m)]} ${y}` : y;
  };

  // 15 - TODOS LOS PERÍODOS DISPONIBLES EN LAS FACTURAS (para el picker):
  const periodosDisponibles = [...new Set(facturas.map(f => f.periodo))].sort((a, b) => b.localeCompare(a));

  // 15a - FILTRO POR ESTADO:
  const facturasFiltradas = facturas.filter(f => {
    const matchEstado  = filtroEstado === 'todos' || f.estado === filtroEstado;
    const matchPeriodo = !periodoFiltro || f.periodo === periodoFiltro;
    return matchEstado && matchPeriodo;
  });

  // 15b - AGRUPO POR PERÍODO (más reciente primero):
  const porPeriodo = facturasFiltradas.reduce((acc, f) => {
    if (!acc[f.periodo]) acc[f.periodo] = [];
    acc[f.periodo].push(f);
    return acc;
  }, {});
  const periodosOrdenados = Object.keys(porPeriodo).sort((a, b) => b.localeCompare(a));

  // 16 - PANTALLA DE CARGA:
  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><p>Cargando...</p></div>;

  // 17 - RENDERIZO LA PÁGINA:
  return (
    <>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Facturas</h1>
        <p>
          {facturas.length} factura{facturas.length !== 1 ? 's' : ''} emitida{facturas.length !== 1 ? 's' : ''}
          {' · '}{clientesAdm.length} cliente{clientesAdm.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* BOTONES DE ACCIÓN PRINCIPALES */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* GENERAR PERÍODO COMPLETO */}
        <button className="btn btn-primary btn-sm" onClick={() => { setResultadoGen(null); setModalGenerar(true); }}>
          <Zap size={15} /> Generar período
        </button>

        {/* NUEVA FACTURA MANUAL (COMENTADO A PETICIÓN) */}
        {/* 
        <button className="btn btn-secondary btn-sm" onClick={() => setModal(true)}>
          <Plus size={15} /> Nueva factura manual
        </button>
        */}
      </div>

      {/* FILTROS POR ESTADO */}
      <div className="filter-tabs">
        {[
          { key: 'todos',     label: 'Todas'      },
          { key: 'pendiente', label: 'Pendientes' },
          { key: 'pagado',    label: 'Pagadas'    },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`filter-tab${filtroEstado === key ? ' active' : ''}`}
            onClick={() => setFiltroEstado(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── SELECTOR DE PERÍODO CON MINI CALENDARIO ── */}
      <div style={{ position: 'relative', marginBottom: 20 }} ref={pickerRef}>

        {/* BOTÓN DISPARADOR DEL PICKER */}
        <button
          onClick={() => setShowPeriodPicker(v => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--color-primary)', color: '#fff',
            borderRadius: 'var(--radius-full)', padding: '5px 16px',
            fontWeight: 700, fontSize: '0.84rem',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
            transition: 'var(--transition)'
          }}
        >
          <Calendar size={14} />
          {periodoFiltro ? fmtPeriodo(periodoFiltro) : 'Todos los períodos'}
          <ChevronDown size={13} style={{ opacity: 0.8, transform: showPeriodPicker ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
        </button>

        {/* DROPDOWN DEL MINI CALENDARIO */}
        {showPeriodPicker && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 200,
            background: '#fff', borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)',
            padding: 16, minWidth: 240, animation: 'slideUp 0.15s ease'
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Seleccionar período
            </div>

            {/* OPCIÓN: TODOS LOS PERÍODOS */}
            <button
              onClick={() => { setPeriodoFiltro(null); setShowPeriodPicker(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', marginBottom: 12, // 1 - AUMENTO EL MARGEN HACIA ABAJO
                borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                background: !periodoFiltro ? 'var(--color-primary-light)' : 'transparent',
                color: !periodoFiltro ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: !periodoFiltro ? 700 : 400, fontSize: '0.875rem',
                transition: 'var(--transition)'
              }}
            >
              📋 Todos los períodos
            </button>

            {/* PERÍODOS DISPONIBLES */}
            {periodosDisponibles.map(p => (
              <button
                key={p}
                onClick={() => { setPeriodoFiltro(p); setShowPeriodPicker(false); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', marginBottom: 4,
                  borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                  background: periodoFiltro === p ? 'var(--color-primary-light)' : 'transparent',
                  color: periodoFiltro === p ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontWeight: periodoFiltro === p ? 700 : 400, fontSize: '0.8975rem',
                  transition: 'var(--transition)'
                }}
              >
                📅 {fmtPeriodo(p)}
              </button>
            ))}

            {/* SEPARADOR + PICKER PERSONALIZADO */}
            <div style={{ borderTop: '1px solid var(--border-color)', margin: '10px 0 8px' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              Otro período:
            </div>
            <input
              type="month"
              style={{
                width: '100%', padding: '8px 10px',
                borderRadius: 'var(--radius-md)', border: '1.5px solid var(--border-color)',
                fontFamily: 'var(--font)', fontSize: '0.875rem', color: 'var(--text-primary)',
                background: 'var(--bg-main)', outline: 'none', cursor: 'pointer'
              }}
              value={periodoFiltro || ''}
              onChange={e => {
                setPeriodoFiltro(e.target.value || null);
                setShowPeriodPicker(false);
              }}
            />
          </div>
        )}
      </div>

      {/* ESTADO VACÍO */}
      {facturasFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon"><FileText size={28} /></div>
          <h3>Sin facturas</h3>
          <p>
            {periodoFiltro
              ? `No hay facturas emitidas en ${fmtPeriodo(periodoFiltro)}.`
              : filtroEstado === 'todos'
                ? 'Tocá "Generar período" para emitir las facturas de todos los clientes automáticamente.'
                : `No hay facturas ${filtroEstado === 'pagado' ? 'pagadas' : 'pendientes'}.`}
          </p>
        </div>
      ) : (

        // 18 - LISTA AGRUPADA POR PERÍODO:
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 4 }}>
          {periodosOrdenados.map(periodo => (
            <div key={periodo}>

              {/* ENCABEZADO DEL GRUPO: TOTAL DEL PERÍODO */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 10, paddingBottom: 8,
                borderBottom: '2px solid var(--color-primary-light)'
              }}>
                <span style={{ color: 'var(--color-primary)', fontWeight: 800, fontSize: '1.1rem' }}>
                  {fmtPeriodo(periodo)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {porPeriodo[periodo].length} factura{porPeriodo[periodo].length !== 1 ? 's' : ''}
                  {' · '}
                  {fmt(porPeriodo[periodo].reduce((s, f) => s + f.total, 0))} total
                </span>
              </div>

              {/* TITULOS DE COLUMNAS (Solo Desktop) */}
              <div className="factura-header-desktop" style={{
                display: 'flex', alignItems: 'center', padding: '0 22px 10px',
                fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                <div style={{ flex: 1 }}>Cliente</div>
                <div style={{ width: 120, textAlign: 'center' }}>Periodo</div>
                <div style={{ width: 120, textAlign: 'center' }}>Monto</div>
                <div style={{ width: 110, textAlign: 'center' }}>Archivo</div>
                <div style={{ width: 110, textAlign: 'center' }}>Mail</div>
                <div style={{ width: 130, textAlign: 'center' }}>Estado</div>
                <div style={{ width: 90,  textAlign: 'center' }}>Ver detalle</div>
              </div>

              {/* LISTA DE TARJETAS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {porPeriodo[periodo].map(f => {
                  const archivoSeleccionado = archivos[f.id] || null;
                  const estaSubiendo        = subiendo[f.id]  || false;

                  return (
                    <div key={f.id} className="card card-sm" style={{ padding: 0, overflow: 'hidden' }}>

                      {/* ── VERSIÓN ESCRITORIO (Desktop) ── */}
                      <div className="factura-card-desktop">

                        {/* 1. COL CLIENTE */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                          <div style={{
                            width: 50, height: 50, borderRadius: '50%',
                            overflow: 'hidden', flexShrink: 0,
                            background: '#EDE9FE', border: '1px solid #e5e7eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {f.cliente_foto ? (
                              <img src={`http://localhost:3001${f.cliente_foto}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <FileText size={20} color="#7C3AED" />
                            )}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {f.nombre_display}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                              Factura #{String(f.id).padStart(4, '0')}
                            </div>
                          </div>
                        </div>

                        {/* 2. COL PERIODO */}
                        <div style={{ width: 120, textAlign: 'center' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-blue)' }}>
                            {fmtPeriodo(f.periodo)}
                          </span>
                        </div>

                        {/* 3. COL MONTO */}
                        <div style={{ width: 120, textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-primary)' }}>
                            {fmt(f.total)}
                          </span>
                        </div>

                        {/* 4. COL ARCHIVO */}
                        <div style={{ width: 110, display: 'flex', justifyContent: 'center' }}>
                          {f.comprobante ? (
                            <button
                              onClick={() => handleVerComprobante(f.comprobante)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '6px 14px', borderRadius: 'var(--radius-md)',
                                border: '1.5px solid var(--color-primary)', background: 'transparent',
                                color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                              }}
                            >
                              <Eye size={13} /> Ver
                            </button>
                          ) : archivoSeleccionado ? (
                            <div style={{ textAlign: 'center' }}>
                              <span style={{ display: 'block', fontSize: '0.62rem', color: '#22C55E', fontWeight: 700 }}>OK</span>
                              <button onClick={() => setArchivos(prev => { const n = { ...prev }; delete n[f.id]; return n; })}
                                      style={{ border: 'none', background: 'none', color: '#EF4444', fontSize: '0.65rem', textDecoration: 'underline', cursor: 'pointer' }}>Quitar</button>
                            </div>
                          ) : (
                            <label style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 14px', borderRadius: 'var(--radius-md)',
                              background: '#F3F4F6', color: 'var(--text-secondary)',
                              fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                            }}>
                              <Paperclip size={13} /> Subir
                              <input type="file" style={{ display: 'none' }} accept="image/*,application/pdf" onChange={e => setArchivos(prev => ({ ...prev, [f.id]: e.target.files[0] }))} />
                            </label>
                          )}
                        </div>

                        {/* 5. COL MAIL */}
                        <div style={{ width: 110, display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleEnviarMail(f.id, f.nombre_display)}
                            disabled={enviandoMail[f.id] || mailEnviado[f.id]}
                            title={mailEnviado[f.id] ? `Mail enviado a ${f.nombre_display}` : `Enviar factura por mail a ${f.nombre_display}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5,
                              padding: '6px 14px', borderRadius: 'var(--radius-md)',
                              border: '1.5px solid #6B7280', background: 'transparent',
                              color: '#6B7280', fontSize: '0.8rem', fontWeight: 600,
                              cursor: (enviandoMail[f.id] || mailEnviado[f.id]) ? 'default' : 'pointer',
                              opacity: (enviandoMail[f.id] || mailEnviado[f.id]) ? 0.6 : 1,
                              transition: 'all 0.18s'
                            }}
                          >
                            <Mail size={13} />
                            {enviandoMail[f.id] ? '...' : mailEnviado[f.id] ? 'Mail enviado' : 'Enviar'}
                          </button>
                        </div>

                        {/* 6. COL ESTADO */}
                        <div style={{ width: 130, display: 'flex', justifyContent: 'center' }}>
                          {f.estado === 'pagado' ? (
                            <span className="badge-pago status-pagado" style={{ margin: 0, padding: '5px 14px' }}>
                              <CheckCircle size={12} /> Pagada
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarcarPagado(f.id, f.comprobante)}
                              disabled={estaSubiendo}
                              style={{
                                padding: '6px 12px', borderRadius: 99, border: 'none',
                                background: archivoSeleccionado ? 'var(--color-primary)' : '#D1D5DB',
                                color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                                cursor: archivoSeleccionado ? 'pointer' : 'default'
                              }}
                            >
                              {estaSubiendo ? '...' : 'Marcar Pago'}
                            </button>
                          )}
                        </div>

                        {/* 7. COL VER MÁS (Flecha) */}
                        <div
                          style={{ width: 90, display: 'flex', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                          onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                        >
                          {expandida === f.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>

                      {/* ── VERSIÓN MÓVIL ── */}
                      <div className="factura-card-mobile" onClick={() => setExpandida(expandida === f.id ? null : f.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {f.cliente_foto ? <img src={`http://localhost:3001${f.cliente_foto}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FileText size={18} color="#7C3AED" />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.94rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nombre_display}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>#{String(f.id).padStart(4, '0')}</div>
                          </div>
                          <ChevronDown size={20} style={{ color: 'var(--text-tertiary)', transform: expandida === f.id ? 'rotate(180deg)' : 'none' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', background: 'var(--bg-main)', padding: '10px 14px', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Periodo</span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-blue)' }}>{f.periodo}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ display: 'block', fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-primary)' }}>{fmt(f.total)}</span>
                            <span style={{ fontSize: '0.7rem', color: f.estado === 'pagado' ? '#10B981' : '#3B82F6', fontWeight: 700 }}>{f.estado.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>

                      {/* ── PANEL EXPANDIDO (Ambas versiones) ── */}
                      {expandida === f.id && (
                        <div style={{ borderTop: '1px solid var(--border-color)', background: '#FAFAFA' }}>
                          {f.detalle?.length > 0 ? (
                            <div style={{ padding: '15px 22px' }}>
                              {f.detalle.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 0', borderBottom: '1px dashed #eee' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{item.descripcion}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{item.cantidad} x {fmt(item.importe)}</div>
                                  </div>
                                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)' }}>{fmt(item.importe * item.cantidad)}</div>
                                </div>
                              ))}
                              <div style={{ textAlign: 'right', paddingTop: 12, fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem' }}>Total: {fmt(f.total)}</div>
                            </div>
                          ) : (
                            <div style={{ padding: '15px 22px', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>Sin detalle</div>
                          )}

                          <div style={{ padding: '12px 22px 20px', borderTop: '1px solid #eee', display: 'flex', gap: 10 }}>
                            <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); handleImprimir(f.id); }}>
                              <Printer size={14} /> PDF
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ padding: '6px 10px', color: '#EF4444' }} onClick={(e) => { e.stopPropagation(); handleEliminar(f.id, f.nombre_display); }}>
                              <Trash2 size={14} /> Eliminar
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: GENERAR PERÍODO COMPLETO ── */}
      <Modal isOpen={modalGenerar} onClose={() => setModalGenerar(false)} title="⚡ Generar período completo">
        <p style={{ marginBottom: 16, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Se creará automáticamente <strong>una factura por cada cliente</strong> que tenga
          servicios asignados, incluyendo todos sus servicios como ítems del detalle.
        </p>
        <div className="form-group">
          <label>Período a generar *</label>
          <input type="month" value={periodoGenerar} onChange={e => setPeriodoGenerar(e.target.value)} />
        </div>
        {resultadoGen && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #22C55E',
            borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12,
            fontSize: '0.87rem', color: '#15803D'
          }}>
            <strong>✅ {resultadoGen.mensaje}</strong><br />
            <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              {resultadoGen.omitidas     > 0 && `${resultadoGen.omitidas} ya existían · `}
              {resultadoGen.sinServicios > 0 && `${resultadoGen.sinServicios} clientes sin servicios`}
            </span>
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setModalGenerar(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleGenerarPeriodo} disabled={generando}>
            {generando ? 'Generando...' : '⚡ Generar facturas'}
          </button>
        </div>
      </Modal>

      {/* ── MODAL: NUEVA FACTURA MANUAL ── */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="✏️ Nueva factura manual">
        <div className="form-group">
          <label>Tipo de cliente</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={`btn btn-sm ${!form.cliente_adm_id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForm({ ...FORM_VACIO, periodo: form.periodo })}>Portal</button>
            <button type="button" className={`btn btn-sm ${form.cliente_adm_id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForm({ ...FORM_VACIO, periodo: form.periodo, client_id: '' })}>Admin</button>
          </div>
        </div>
        {!form.cliente_adm_id && (
          <div className="form-group">
            <label>Cliente portal *</label>
            <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
              <option value="">Seleccioná un cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.email})</option>)}
            </select>
          </div>
        )}
        {form.cliente_adm_id !== undefined && !form.client_id && (
          <div className="form-group">
            <label>Cliente admin *</label>
            <select value={form.cliente_adm_id} onChange={e => cargarServiciosDeCliente(e.target.value)}>
              <option value="">Seleccioná un cliente...</option>
              {clientesAdm.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
            {form.cliente_adm_id && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', marginTop: 4 }}>
                ✅ Servicios precargados automáticamente
              </span>
            )}
          </div>
        )}
        <div className="form-group">
          <label>Período *</label>
          <input type="month" value={form.periodo} onChange={e => setForm({ ...form, periodo: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Ítems de la factura</label>
          {form.detalle.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 32px', gap: 6, marginBottom: 8 }}>
              <input placeholder="Descripción del servicio" value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} />
              <input type="number" placeholder="Cant" min="1" value={item.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value)} />
              <input type="number" placeholder="Importe" min="0" value={item.importe} onChange={e => updateItem(idx, 'importe', e.target.value)} />
              <button className="btn-icon" onClick={() => quitarItem(idx)} style={{ color: '#EF4444' }} disabled={form.detalle.length === 1}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={agregarItem}><Plus size={14} /> Agregar ítem</button>
        </div>
        <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)', margin: '8px 0' }}>
          Total: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(totalForm)}
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Emitir factura'}
          </button>
        </div>
      </Modal>

    </>
  );
}
