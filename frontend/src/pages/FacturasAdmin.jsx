// ============================================================
// PÁGINA: FACTURAS PORTAL - GESTIÓN DE FACTURAS (admin)
// ============================================================

 // 1 - IMPORTO REACT, REACT ROUTER, ÍCONOS Y MODAL:
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, FileText, ChevronDown, ChevronUp, Trash2, Printer, Zap, CheckCircle, Clock, Calendar, Paperclip } from 'lucide-react';
import Modal from '../components/Modal';

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

export default function FacturasAdmin() {
  // 2 - LEO EL ESTADO DE NAVEGACIÓN (para saber si vengo desde una notificación):
  const location    = useLocation();
  const highlightId = location.state?.highlightId ?? null;

  // 3 - ESTADOS:
  const [facturas,      setFacturas]      = useState([]);
  const [clients,       setClients]       = useState([]);
  const [clientesAdm,   setClientesAdm]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modal,         setModal]         = useState(false);
  const [modalGenerar,  setModalGenerar]  = useState(false);
  const [guardando,     setGuardando]     = useState(false);
  const [generando,     setGenerando]     = useState(false);
  const [expandida,     setExpandida]     = useState(null);
  const [form,          setForm]          = useState({ ...FORM_VACIO });
  const [periodoGenerar, setPeriodoGenerar] = useState(new Date().toISOString().slice(0, 7));
  const [resultadoGen,   setResultadoGen]   = useState(null);
  const [filtroEstado,   setFiltroEstado]   = useState('todos');
  // ESTADO PARA FILTRAR POR PERÍODO ESPECÍFICO:
  const [filtroPeriodo,  setFiltroPeriodo]  = useState('todos');
  // ESTADO PARA ABRIR/CERRAR EL DROPDOWN DE PERÍODOS:
  const [periodoDropOpen, setPeriodoDropOpen] = useState(false);
  // ESTADO PARA EL CARD RESALTADO (cuando vengo desde una notificación):
  const [highlightedId,  setHighlightedId]  = useState(null);

  // 4 - CARGO DATOS AL MONTAR:
  useEffect(() => { cargarDatos(); }, []);

  // 4b - FUNCIÓN QUE EJECUTA EL SCROLL SUAVE + HIGHLIGHT (reutilizable):
  function triggerHighlight(id) {
    // 4b-1 - ME ASEGURO QUE EL FILTRO MUESTRE TODAS LAS FACTURAS:
    setFiltroEstado('todos');

    // 4b-2 - LIMPIO CUALQUIER HIGHLIGHT ANTERIOR INMEDIATAMENTE:
    setHighlightedId(null);

    // 4b-3 - ESPERO UN FRAME PARA QUE EL DOM SE ACTUALICE:
    setTimeout(() => {
      const el = document.getElementById(`factura-${id}`);
      if (!el) return;

      // 4b-4 - SCROLL SUAVE, CENTRANDO EL CARD EN PANTALLA:
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 4b-5 - ACTIVO EL HIGHLIGHT DESPUÉS DE QUE EL SCROLL LLEGA:
      setTimeout(() => {
        setHighlightedId(id);
        // 4b-6 - APAGO EL HIGHLIGHT AL TERMINAR LA ANIMACIÓN (3.2s):
        setTimeout(() => setHighlightedId(null), 3200);
      }, 650);
    }, 80);
  }

  // 4c - SE DISPARA AL TERMINAR LA CARGA INICIAL (página abierta por primera vez):
  useEffect(() => {
    if (!loading && highlightId) {
      triggerHighlight(highlightId);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // 4d - SE DISPARA EN CADA NAVEGACIÓN A ESTA PÁGINA (location.key cambia en cada navigate()).
  //      Esto permite re-disparar incluso si la notificación ya estaba leída:
  useEffect(() => {
    if (highlightId && !loading) {
      triggerHighlight(highlightId);
    }
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  async function cargarDatos() {
    try {
      setLoading(true);
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

  // 4 - CUANDO SE SELECCIONA UN CLIENTE ADMIN EN EL FORM, AUTO-CARGO SUS SERVICIOS:
  async function cargarServiciosDeCliente(clienteAdmId) {
    if (!clienteAdmId) {
      setForm(f => ({ ...f, cliente_adm_id: '', detalle: [{ ...ITEM_VACIO }] }));
      return;
    }
    try {
      // 4a - BUSCO EL CLIENTE CON SUS SERVICIOS:
      const cliente = await req(`/clientes/${clienteAdmId}`);
      const detalleCargado = (cliente.servicios || []).map(s => ({
        descripcion: s.nombre,
        cantidad:    1,
        importe:     s.precio
      }));

      // 4b - SI TIENE SERVICIOS LOS PRECARGO, SINO DEJO UN ÍTEM VACÍO:
      setForm(f => ({
        ...f,
        cliente_adm_id: clienteAdmId,
        detalle:        detalleCargado.length > 0 ? detalleCargado : [{ ...ITEM_VACIO }]
      }));
    } catch (err) {
      console.error('Error al cargar servicios:', err);
      setForm(f => ({ ...f, cliente_adm_id: clienteAdmId }));
    }
  }

  // 5 - AGREGO / QUITO ÍTEMS DEL DETALLE:
  const agregarItem = () => setForm({ ...form, detalle: [...form.detalle, { ...ITEM_VACIO }] });
  const quitarItem  = (i) => setForm({ ...form, detalle: form.detalle.filter((_, idx) => idx !== i) });
  const updateItem  = (i, field, val) => {
    const d = [...form.detalle];
    d[i] = { ...d[i], [field]: val };
    setForm({ ...form, detalle: d });
  };

  // 6 - CALCULO EL TOTAL DINÁMICO:
  const total = form.detalle.reduce((s, it) => s + (Number(it.cantidad) * Number(it.importe) || 0), 0);

  // 7 - GUARDO LA FACTURA MANUAL:
  async function handleGuardar() {
    if ((!form.client_id && !form.cliente_adm_id) || !form.periodo) {
      alert('Seleccioná un cliente y un período');
      return;
    }
    try {
      setGuardando(true);
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

  // 8 - GENERO FACTURAS PARA TODO UN PERÍODO:
  async function handleGenerarPeriodo() {
    if (!periodoGenerar) { alert('Seleccioná un período'); return; }
    try {
      setGenerando(true);
      setResultadoGen(null);
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

  // 9 - ELIMINO UNA FACTURA:
  async function handleEliminar(id, nombre) {
    if (!confirm(`¿Eliminar la factura de ${nombre}? Esta acción no se puede deshacer.`)) return;
    try {
      await req(`/facturas-portal/${id}`, { method: 'DELETE' });
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 10 - MARCO UNA FACTURA COMO PAGADA:
  async function handleMarcarPagado(id) {
    try {
      await req(`/facturas-portal/${id}/pagar`, { method: 'PUT' });
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 11 - ABRO EL PDF DIRECTO EN UNA PESTAÑA NUEVA (mismo PDF que se adjunta al mail):
  function handleImprimir(id) {
    window.open(`/api/facturas-portal/${id}/pdf`, '_blank');
  }

  // 12 - FORMATEOS:
  const fmt = (m) => new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0
  }).format(m);

  const fmtPeriodo = (p) => {
    if (!p) return '';
    const [y, m] = p.split('-');
    const meses = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return m ? `${meses[parseInt(m)]} ${y}` : y;
  };

  // 14 - FILTRO POR ESTADO Y POR PERÍODO:
  const facturasFiltradas = facturas.filter(f => {
    // 14a - FILTRO POR ESTADO:
    const pasaEstado = filtroEstado === 'todos' ? true : f.estado === filtroEstado;
    // 14b - FILTRO POR PERÍODO:
    const pasaPeriodo = filtroPeriodo === 'todos' ? true : f.periodo === filtroPeriodo;
    return pasaEstado && pasaPeriodo;
  });

  // 14c - LISTA ÚNICA DE PERÍODOS DISPONIBLES (para el dropdown):
  const periodosDisponibles = [...new Set(facturas.map(f => f.periodo))].sort((a, b) => b.localeCompare(a));

  // 14a - AGRUPO POR PERÍODO (más reciente primero):
  const porPeriodo = facturasFiltradas.reduce((acc, f) => {
    if (!acc[f.periodo]) acc[f.periodo] = [];
    acc[f.periodo].push(f);
    return acc;
  }, {});
  const periodosOrdenados = Object.keys(porPeriodo).sort((a, b) => b.localeCompare(a));

  if (loading) return <div className="empty-state"><p>Cargando...</p></div>;

  // 15 - RENDERIZO LA PÁGINA:
  return (
    <>
      {/* ── ANIMACIÓN DE HIGHLIGHT (estilo Apple: sutil, sofisticada) ── */}
      <style>{`
        @keyframes facturaGlow {
          0%   {
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            border-color: transparent;
          }
          10%  {
            box-shadow: 0 0 0 2px rgba(124,58,237,0.22), 0 2px 14px rgba(124,58,237,0.09);
            border-color: rgba(124,58,237,0.35);
            background-color: rgba(124,58,237,0.025);
          }
          72%  {
            box-shadow: 0 0 0 2px rgba(124,58,237,0.22), 0 2px 14px rgba(124,58,237,0.09);
            border-color: rgba(124,58,237,0.35);
            background-color: rgba(124,58,237,0.025);
          }
          100% {
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            border-color: transparent;
            background-color: transparent;
          }
        }
        .factura-glow {
          animation: facturaGlow 3.2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
          border: 1px solid transparent;
        }

        /* BADGE COMPROBANTE PENDIENTE: llamada de atención para el admin */
        .badge-comprobante {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 3px 10px;
          border-radius: 999px;
          background: #FEF3C7;
          color: #92400E;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid #FDE68A;
        }

        /* SECCIÓN COMPROBANTE EN PANEL EXPANDIDO */
        .comprobante-section {
          padding: 14px 22px;
          background: #FFFBEB;
          border-bottom: 1px solid #FDE68A;
        }
        .comprobante-label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.74rem;
          font-weight: 700;
          color: #92400E;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 10px;
        }
        .comprobante-img {
          max-height: 220px;
          max-width: 100%;
          border-radius: 10px;
          border: 1.5px solid #FDE68A;
          object-fit: contain;
          cursor: zoom-in;
          display: block;
          transition: opacity 0.15s;
        }
        .comprobante-img:hover { opacity: 0.88; }
        .comprobante-pdf-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #F59E0B;
          color: #fff;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.88rem;
          text-decoration: none;
          transition: background 0.15s, transform 0.12s;
        }
        .comprobante-pdf-btn:hover {
          background: #D97706;
          transform: translateY(-1px);
        }
      `}</style>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Portal de Facturas</h1>
        <p>
          {facturas.length} factura{facturas.length !== 1 ? 's' : ''} emitida{facturas.length !== 1 ? 's' : ''}
          {' · '}{clientesAdm.length} cliente{clientesAdm.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── CONTROLES SUPERIORES: BOTÓN GENERAR + FILTROS ── */}
      <style>{`
        /* BOTÓN GENERAR PERÍODO: estilo pill, prominente */
        .btn-generar-periodo {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 13px 26px;
          font-size: 0.97rem;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
          box-shadow: 0 4px 14px rgba(124,58,237,0.22);
          letter-spacing: 0.01em;
        }
        .btn-generar-periodo:hover {
          background: var(--color-primary-dark, #6d28d9);
          box-shadow: 0 6px 20px rgba(124,58,237,0.32);
          transform: translateY(-1px);
        }
        .btn-generar-periodo:active { transform: translateY(0); }

        /* SEGMENTED CONTROL: pill contenedor */
        .seg-control {
          display: inline-flex;
          background: rgba(124,58,237,0.07);
          border-radius: 999px;
          padding: 4px;
          gap: 2px;
        }
        .seg-btn {
          border: none;
          background: transparent;
          border-radius: 999px;
          padding: 8px 20px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          transition: background 0.18s, color 0.18s, box-shadow 0.18s;
          white-space: nowrap;
        }
        .seg-btn.active {
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 2px 8px rgba(124,58,237,0.22);
        }
        .seg-btn:not(.active):hover {
          background: rgba(124,58,237,0.10);
          color: var(--color-primary);
        }

        /* DROPDOWN PERÍODOS: botón pill ancho */
        .periodo-drop-wrap {
          position: relative;
          display: inline-block;
        }
        .btn-periodo-drop {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 13px 22px;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.15s, box-shadow 0.15s;
          box-shadow: 0 4px 14px rgba(124,58,237,0.18);
          min-width: 220px;
          justify-content: space-between;
        }
        .btn-periodo-drop:hover { background: var(--color-primary-dark, #6d28d9); }
        .periodo-dropdown-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          min-width: 220px;
          background: #fff;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.12);
          z-index: 50;
          overflow: hidden;
          animation: dropFadeIn 0.15s ease;
        }
        @keyframes dropFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .periodo-drop-item {
          display: block;
          width: 100%;
          padding: 11px 18px;
          text-align: left;
          border: none;
          background: transparent;
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
          cursor: pointer;
          transition: background 0.12s;
        }
        .periodo-drop-item:hover { background: rgba(124,58,237,0.07); }
        .periodo-drop-item.active {
          background: rgba(124,58,237,0.10);
          color: var(--color-primary);
          font-weight: 700;
        }
      `}</style>

      {/* FILA 1: BOTÓN GENERAR PERÍODO */}
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn-generar-periodo"
          onClick={() => { setResultadoGen(null); setModalGenerar(true); }}
        >
          <Zap size={18} fill="currentColor" />
          Generar período
        </button>
      </div>

      {/* FILA 2: SEGMENTED CONTROL DE ESTADO */}
      <div style={{ marginBottom: 14 }}>
        <div className="seg-control">
          {[
            { key: 'todos',     label: 'Todas'      },
            { key: 'pendiente', label: 'Pendientes' },
            { key: 'pagado',    label: 'Pagadas'    },
          ].map(({ key, label }) => (
            <button
              key={key}
              className={`seg-btn${filtroEstado === key ? ' active' : ''}`}
              onClick={() => setFiltroEstado(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* FILA 3: DROPDOWN DE FILTRO POR PERÍODO */}
      <div style={{ marginBottom: 24 }}>
        <div className="periodo-drop-wrap">
          {/* BOTÓN QUE ABRE/CIERRA EL DROPDOWN */}
          <button
            className="btn-periodo-drop"
            onClick={() => setPeriodoDropOpen(v => !v)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Calendar size={17} />
              {filtroPeriodo === 'todos' ? 'Todos los períodos' : fmtPeriodo(filtroPeriodo)}
            </span>
            <ChevronDown size={17} style={{ transition: 'transform 0.2s', transform: periodoDropOpen ? 'rotate(180deg)' : 'none' }} />
          </button>

          {/* MENÚ DESPLEGABLE DE PERÍODOS */}
          {periodoDropOpen && (
            <div className="periodo-dropdown-menu">
              {/* OPCIÓN "TODOS LOS PERÍODOS" */}
              <button
                className={`periodo-drop-item${filtroPeriodo === 'todos' ? ' active' : ''}`}
                onClick={() => { setFiltroPeriodo('todos'); setPeriodoDropOpen(false); }}
              >
                Todos los períodos
              </button>
              {/* OPCIÓN POR CADA PERÍODO DISPONIBLE */}
              {periodosDisponibles.map(p => (
                <button
                  key={p}
                  className={`periodo-drop-item${filtroPeriodo === p ? ' active' : ''}`}
                  onClick={() => { setFiltroPeriodo(p); setPeriodoDropOpen(false); }}
                >
                  {fmtPeriodo(p)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LISTA SIN RESULTADOS */}
      {facturasFiltradas.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon"><FileText size={28} /></div>
          <h3>Sin facturas</h3>
          <p>
            {filtroEstado === 'todos'
              ? 'Tocá "Generar período" para emitir las facturas de todos los clientes automáticamente.'
              : `No hay facturas ${filtroEstado === 'pagado' ? 'pagadas' : 'pendientes'}.`}
          </p>
        </div>
      ) : (
        // LISTA AGRUPADA POR PERÍODO:
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
          {periodosOrdenados.map(periodo => (
            <div key={periodo}>

              {/* ENCABEZADO DEL GRUPO (PERÍODO) */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 8, paddingBottom: 8,
                borderBottom: '2px solid var(--color-primary-light)'
              }}>
                <span style={{
                  background: 'var(--color-primary)', color: '#fff',
                  borderRadius: 'var(--radius-full)', padding: '3px 14px',
                  fontWeight: 700, fontSize: '0.82rem'
                }}>
                  {fmtPeriodo(periodo)}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {porPeriodo[periodo].length} factura{porPeriodo[periodo].length !== 1 ? 's' : ''}
                  {' · '}
                  {fmt(porPeriodo[periodo].reduce((s, f) => s + f.total, 0))} total
                </span>
              </div>

              {/* CARDS DE FACTURAS DEL PERÍODO */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {porPeriodo[periodo].map(f => (
                  <div
                    key={f.id}
                    id={`factura-${f.id}`}
                    className={`card card-sm${highlightedId === f.id ? ' factura-glow' : ''}`}
                    style={{ padding: 0, overflow: 'hidden' }}
                  >
                    {/* FILA PRINCIPAL: CLIENTE | TOTAL | ESTADO | ACCIONES */}
                    <div
                      className="fact-card-row"
                      style={{ display: 'flex', alignItems: 'center', padding: '18px 22px', gap: 16, cursor: 'pointer' }}
                      onClick={() => setExpandida(expandida === f.id ? null : f.id)}
                    >
                      {/* FOTO DE PERFIL DEL CLIENTE */}
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        overflow: 'hidden',
                        background: '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        border: '1px solid #e5e7eb'
                      }}>
                        {f.cliente_foto ? (
                          <img
                            src={`http://localhost:3001${f.cliente_foto}`}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <FileText size={18} color="#9ca3af" />
                        )}
                      </div>

                      {/* NOMBRE DEL CLIENTE */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                          {f.nombre_display}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          Factura #{String(f.id).padStart(4, '0')}
                        </div>
                      </div>

                      {/* GRUPO DERECHO: monto + badges + chevron (se baja a segunda línea en mobile) */}
                      <div className="fact-card-right" style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

                        {/* MONTO */}
                        <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                          {fmt(f.total)}
                        </span>

                        {/* BADGE DE ESTADO */}
                        <span className={`badge-pago status-${f.estado}`}>
                          {f.estado === 'pagado'
                            ? <><CheckCircle size={12} /> Pagada</>
                            : <><Clock size={12} /> Pendiente</>}
                        </span>

                        {/* BADGE COMPROBANTE: solo si hay comprobante Y la factura sigue pendiente */}
                        {f.comprobante && f.estado === 'pendiente' && (
                          <span className="badge-comprobante">
                            <Paperclip size={11} /> Comprobante
                          </span>
                        )}

                        {/* FLECHA EXPAND */}
                        {expandida === f.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}

                      </div>
                    </div>

                    {/* DETALLE EXPANDIDO */}
                    {expandida === f.id && (
                      <div style={{ borderTop: '1px solid var(--border-color)', background: '#fafafa' }}>

                        {/* SERVICIOS DEL DETALLE */}
                        {f.detalle?.length > 0 ? (
                          <div style={{ padding: '14px 22px' }}>
                            {f.detalle.map(item => (
                              <div
                                key={item.id}
                                style={{
                                  display: 'flex', justifyContent: 'space-between',
                                  padding: '8px 0', fontSize: '0.86rem',
                                  borderBottom: '1px dashed var(--border-color)'
                                }}
                              >
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {item.descripcion}
                                  <span style={{ color: 'var(--text-tertiary)', marginLeft: 6 }}>× {item.cantidad}</span>
                                </span>
                                <span style={{ fontWeight: 600 }}>{fmt(item.importe * item.cantidad)}</span>
                              </div>
                            ))}
                            {/* SUBTOTAL */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 12, fontWeight: 800, color: 'var(--color-primary)' }}>
                              Total: {fmt(f.total)}
                            </div>
                          </div>
                        ) : (
                          <div style={{ padding: '14px 22px', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>
                            Sin ítems de detalle
                          </div>
                        )}

                        {/* COMPROBANTE DE PAGO (si el cliente subió uno) */}
                        {f.comprobante && (
                          <div className="comprobante-section">

                            {/* ETIQUETA DE SECCIÓN */}
                            <div className="comprobante-label">
                              <Paperclip size={13} />
                              Comprobante de pago del cliente
                            </div>

                            {/* SI ES IMAGEN (jpg, jpeg, png, gif, webp): MOSTRAR THUMBNAIL */}
                            {/\.(jpg|jpeg|png|gif|webp)$/i.test(f.comprobante) ? (
                              <a
                                href={`http://localhost:3001${f.comprobante}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Clic para ver en tamaño completo"
                              >
                                <img
                                  src={`http://localhost:3001${f.comprobante}`}
                                  alt="Comprobante de pago"
                                  className="comprobante-img"
                                />
                              </a>
                            ) : (
                              // SI ES PDF U OTRO ARCHIVO: MOSTRAR BOTÓN DE DESCARGA
                              <a
                                href={`http://localhost:3001${f.comprobante}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="comprobante-pdf-btn"
                              >
                                <FileText size={16} />
                                Ver comprobante PDF
                              </a>
                            )}

                          </div>
                        )}

                        {/* BOTONES DE ACCIÓN */}
                        <div style={{ display: 'flex', gap: 10, padding: '12px 22px 16px', borderTop: '1px solid var(--border-color)' }}>

                          {/* IMPRIMIR / PDF */}
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleImprimir(f.id)}
                            title="Ver / Imprimir factura"
                          >
                            <Printer size={14} /> Imprimir PDF
                          </button>

                          {/* MARCAR COMO PAGADA (solo si está pendiente) */}
                          {f.estado === 'pendiente' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleMarcarPagado(f.id)}
                              style={{ color: 'var(--color-green)' }}
                            >
                              <CheckCircle size={14} /> Marcar pagada
                            </button>
                          )}

                          {/* ELIMINAR */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleEliminar(f.id, f.nombre_display)}
                            style={{ color: 'var(--color-red)', marginLeft: 'auto' }}
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>

                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: GENERAR PERÍODO COMPLETO ── */}
      <Modal isOpen={modalGenerar} onClose={() => setModalGenerar(false)} title="⚡ Generar período completo">
        <p style={{ marginBottom: 16, fontSize: '0.88rem' }}>
          Se creará automáticamente <strong>una factura por cada cliente</strong> que tenga servicios asignados,
          con todos sus servicios como ítems del detalle.
        </p>
        <div className="form-group">
          <label>Período a generar *</label>
          <input
            type="month"
            value={periodoGenerar}
            onChange={e => setPeriodoGenerar(e.target.value)}
          />
        </div>

        {/* RESULTADO DE LA GENERACIÓN */}
        {resultadoGen && (
          <div style={{
            background: '#F0FDF4', border: '1px solid #22C55E',
            borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 12,
            fontSize: '0.87rem', color: '#15803D'
          }}>
            <strong>✅ {resultadoGen.mensaje}</strong><br />
            <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
              {resultadoGen.omitidas > 0 && `${resultadoGen.omitidas} ya existían · `}
              {resultadoGen.sinServicios > 0 && `${resultadoGen.sinServicios} sin servicios asignados`}
            </span>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setModalGenerar(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleGenerarPeriodo} disabled={generando}>
            {generando ? 'Generando...' : `⚡ Generar facturas`}
          </button>
        </div>
      </Modal>

      {/* ── MODAL: NUEVA FACTURA MANUAL ── */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title="✏️ Nueva factura manual">

        {/* TIPO DE CLIENTE */}
        <div className="form-group">
          <label>Tipo de cliente</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className={`btn btn-sm ${!form.cliente_adm_id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForm({ ...FORM_VACIO, periodo: form.periodo })}
            >
              Portal
            </button>
            <button
              type="button"
              className={`btn btn-sm ${form.cliente_adm_id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setForm({ ...FORM_VACIO, periodo: form.periodo, client_id: '' })}
            >
              Admin
            </button>
          </div>
        </div>

        {/* CLIENTE PORTAL */}
        {!form.cliente_adm_id && (
          <div className="form-group">
            <label>Cliente portal *</label>
            <select
              value={form.client_id}
              onChange={e => setForm({ ...form, client_id: e.target.value })}
            >
              <option value="">Seleccioná un cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} ({c.email})</option>)}
            </select>
          </div>
        )}

        {/* CLIENTE ADMIN (con AUTO-CARGA DE SERVICIOS) */}
        {form.cliente_adm_id !== undefined && !form.client_id && (
          <div className="form-group">
            <label>Cliente admin *</label>
            <select
              value={form.cliente_adm_id}
              onChange={e => cargarServiciosDeCliente(e.target.value)}
            >
              <option value="">Seleccioná un cliente...</option>
              {clientesAdm.map(c => <option key={c.id} value={c.id}>{c.razon_social}</option>)}
            </select>
            {form.cliente_adm_id && (
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                ✅ Servicios precargados automáticamente
              </span>
            )}
          </div>
        )}

        <div className="form-group">
          <label>Período *</label>
          <input
            type="month"
            value={form.periodo}
            onChange={e => setForm({ ...form, periodo: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Ítems de la factura</label>
          {form.detalle.map((item, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 90px 32px', gap: 6, marginBottom: 8 }}>
              <input
                placeholder="Descripción del servicio"
                value={item.descripcion}
                onChange={e => updateItem(idx, 'descripcion', e.target.value)}
              />
              <input
                type="number" placeholder="Cant" min="1"
                value={item.cantidad}
                onChange={e => updateItem(idx, 'cantidad', e.target.value)}
              />
              <input
                type="number" placeholder="Importe" min="0"
                value={item.importe}
                onChange={e => updateItem(idx, 'importe', e.target.value)}
              />
              <button
                className="btn-icon"
                onClick={() => quitarItem(idx)}
                style={{ color: '#EF4444' }}
                disabled={form.detalle.length === 1}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" onClick={agregarItem}>
            <Plus size={14} /> Agregar ítem
          </button>
        </div>

        <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)', margin: '8px 0' }}>
          Total: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(total)}
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

