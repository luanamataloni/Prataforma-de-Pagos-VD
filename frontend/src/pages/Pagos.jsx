// ============================================================
// PÁGINA: PAGOS - GESTIÓN Y SEGUIMIENTO DE PAGOS
// ============================================================

// 1 - IMPORTO REACT Y LOS HOOKS:
import { useState, useEffect } from 'react';

// 2 - IMPORTO LOS ÍCONOS:
import { CreditCard, CheckCircle, Clock, Check, Paperclip, Calendar, Eye } from 'lucide-react';

// 3 - IMPORTO LA API:
import { getPagos, updatePago, uploadComprobante } from '../api/index';

export default function Pagos() {

  // 4 - DEFINO EL ESTADO LOCAL:
  const [pagos,     setPagos]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState('todos'); // 'todos' | 'pendiente' | 'pagado'
  const [marcando,  setMarcando]  = useState(null);   // id del pago que se está procesando
  const [subiendo,  setSubiendo]  = useState(null);   // id del pago cuyo archivo se sube

  // 5 - CARGO LOS PAGOS CUANDO CAMBIA EL FILTRO:
  useEffect(() => { cargarPagos(); }, [filtro]);

  // 6 - FUNCIÓN QUE TRAE LOS PAGOS CON EL FILTRO ACTIVO:
  async function cargarPagos() {
    try {
      setLoading(true);
      const filtros = filtro !== 'todos' ? { estado: filtro } : {};
      const data    = await getPagos(filtros);
      setPagos(data);
    } catch (err) {
      console.error('Error al cargar pagos:', err);
    } finally {
      setLoading(false);
    }
  }

  // 7 - MARCO UN PAGO COMO PAGADO:
  async function handleMarcarPagado(pago) {
    if (!confirm(`¿Marcar como pagado el cobro de ${pago.cliente_nombre}?`)) return;
    try {
      setMarcando(pago.id);
      await updatePago(pago.id, { estado: 'pagado' });
      cargarPagos();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setMarcando(null);
    }
  }

  // 14 - MANEJA LA SUBIDA DEL ARCHIVO:
  async function handleUpload(e, pagoId) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setSubiendo(pagoId);
      await uploadComprobante(pagoId, file);
      cargarPagos(); // Recargo para ver el cambio
    } catch (err) {
      alert('Error al subir comprobante: ' + err.message);
    } finally {
      setSubiendo(null);
    }
  }

  // 15 - ABRE EL COMPROBANTE EN OTRA PESTAÑA:
  function verComprobante(ruta) {
    // El backend sirve los archivos en el puerto 3001, pero el frontend usa /api proxy
    // Así que /uploads/... debería funcionar directamente
    window.open(`/api${ruta}`, '_blank');
  }

  // 8 - FORMATEO EL MONTO EN PESOS ARGENTINOS:
  const fmt = (m) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(m);

  // 12 - FORMATEO EL PERIODO (MES/AÑO):
  const fmtPeriodo = (p) => {
    if (!p) return '';
    // p viene como "2024-03" o similar de la DB en periodos mensuales
    const [year, month] = p.split('-');
    if (!month) return p; // por si es anual solo "2024"
    return `${month}/${year.slice(-2)}`;
  };

  // 9 - PANTALLA DE CARGA:
  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><p>Cargando...</p></div>;

  // 10 - RENDERIZO LA PÁGINA:
  return (
    <>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Pagos</h1>
        <p>{pagos.length} cobro{pagos.length !== 1 ? 's' : ''} en total</p>
      </div>

      {/* FILTROS: TODOS / PENDIENTES / PAGADOS */}
      <div className="filter-tabs">
        {[
          { key: 'todos',     label: 'Todos'      },
          { key: 'pendiente', label: 'Pendientes' },
          { key: 'pagado',    label: 'Pagados'    },
        ].map(({ key, label }) => (
          <button
            key={key}
            className={`filter-tab${filtro === key ? ' active' : ''}`}
            onClick={() => setFiltro(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* LISTA VACÍA */}
      {pagos.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon"><CreditCard size={28} /></div>
          <h3>Sin pagos</h3>
          <p>No hay registros de pagos para mostrar en esta sección.</p>
        </div>
      ) : (
        // 11 - TABLA MODERNA TIPO DASHBOARD:
        <div className="modern-table">

          {/* ENCABEZADO DE TABLA (Solo visible en Desktop via CSS) */}
          <div className="table-header-row">
            <div>Título / Cliente</div>
            <div className="text-center">Vencimiento</div>
            <div className="text-center">Estado</div>
            <div className="text-center">Frecuencia</div>
            <div className="text-center">Monto</div>
            <div className="text-center">Documento</div>
            <div className="text-center">Acción</div>
          </div>

          {pagos.map((pago, index) => {
            const esNuevoCliente = index === 0 || pagos[index - 1].cliente_id !== pago.cliente_id;

            return (
              <div key={pago.id}>
                {/* 13 - LÍNEA GRIS SOLO PARA SEPARAR DISTINTOS CLIENTES */}
                {(index > 0 && esNuevoCliente) && <div className="client-separator" />}

                <div className="table-row">
                  {/* COLUMNA 1: TÍTULO Y CLIENTE (Alineado a la izquierda) */}
                  <div className="col-principal">
                    <div className="row-title">{pago.cliente_nombre}</div>
                    <div className="row-subtitle">{pago.servicio_nombre}</div>
                  </div>

                  {/* COLUMNA 2: VENCIMIENTO / PERIODO (Centrado) */}
                  <div className="col-data text-center">
                    <span className="text-sm font-semibold text-vencimiento">
                      {fmtPeriodo(pago.periodo)}
                    </span>
                  </div>

                  {/* COLUMNA 3: BADGE DE ESTADO (Centrado) */}
                  <div className="col-badge text-center">
                    <span className={`badge-pago status-${pago.estado}`}>
                      {pago.estado === 'pagado' ? <CheckCircle size={14} /> : <Clock size={14} />}
                      {pago.estado === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>

                  {/* COLUMNA 4: FRECUENCIA (Centrado) */}
                  <div className="col-badge text-center">
                    <span className={`badge-freq freq-${pago.tipo}`}>
                      <Calendar size={13} className="calendar-icon" />
                      {pago.tipo}
                    </span>
                  </div>

                  {/* COLUMNA 5: MONTO (Centrado) */}
                  <div className="col-monto text-center">
                    <span className="pill-monto">{fmt(pago.monto)}</span>
                  </div>

                  {/* COLUMNA 6: DOCUMENTO (Centrado) */}
                  <div className="col-doc text-center">
                    {pago.comprobante ? (
                      <button 
                        className="btn-doc btn-ver" 
                        onClick={() => verComprobante(pago.comprobante)}
                        style={{ margin: '0 auto' }}
                      >
                        <Eye size={14} /> Ver
                      </button>
                    ) : (
                      <div className="upload-container" style={{ display: 'flex', justifyContent: 'center' }}>
                        <label className="btn-doc" style={{ margin: '0 auto', cursor: 'pointer' }}>
                          <Paperclip size={14} /> {subiendo === pago.id ? '...' : 'Subir'}
                          <input 
                            type="file" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleUpload(e, pago.id)}
                            disabled={subiendo === pago.id}
                            accept="application/pdf,image/*"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* COLUMNA 7: ACCIÓN (Centrada) */}
                  <div className="col-action text-center">
                    {pago.estado === 'pendiente' ? (
                      <button
                        className="btn-pay-action"
                        onClick={() => handleMarcarPagado(pago)}
                        disabled={marcando === pago.id}
                        style={{ margin: '0 auto' }}
                      >
                        {marcando === pago.id ? 'Cargando...' : 'Marcar como pagado'}
                      </button>
                    ) : (
                      <div className="paid-confirmed" style={{ justifyContent: 'center' }}>
                        <CheckCircle size={16} />
                        <span>Pagado</span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
