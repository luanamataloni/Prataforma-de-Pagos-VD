// ============================================================
// PÁGINA: DASHBOARD - INICIO CON ESTADÍSTICAS
// ============================================================

// 1 - IMPORTO REACT Y LOS HOOKS:
import { useState, useEffect } from 'react';

// 2 - IMPORTO LOS ÍCONOS:
import { Users, Package, Clock, CheckCircle, RefreshCw } from 'lucide-react';

// 3 - IMPORTO LAS LLAMADAS A LA API:
import { getStats, getPagos, generarPagos } from '../api/index';

export default function Dashboard() {

  // 4 - DEFINO EL ESTADO LOCAL:
  const [stats,           setStats]           = useState(null);
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [generando,       setGenerando]       = useState(false);

  // 5 - CARGO LOS DATOS AL MONTAR EL COMPONENTE:
  useEffect(() => { cargarDatos(); }, []);

  // 6 - FUNCIÓN QUE CARGA LAS ESTADÍSTICAS Y PAGOS PENDIENTES:
  async function cargarDatos() {
    try {
      setLoading(true);
      const [statsData, pagosData] = await Promise.all([
        getStats(),
        getPagos({ estado: 'pendiente' })
      ]);
      setStats(statsData);
      setPagosPendientes(pagosData.slice(0, 5));
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  // 7 - GENERO LOS PAGOS DEL PERIODO ACTUAL:
  async function handleGenerarPagos() {
    try {
      setGenerando(true);
      const resultado = await generarPagos();
      alert('✅ ' + resultado.mensaje);
      cargarDatos();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGenerando(false);
    }
  }

  // 8 - FORMATEO EL MONTO EN PESOS ARGENTINOS:
  const fmt = (m) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(m);

  // 9 - PANTALLA DE CARGA:
  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><p>Cargando...</p></div>;

  // 10 - RENDERIZO EL DASHBOARD:
  return (
    <>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Inicio 👋</h1>
        <p>Resumen general del sistema</p>
      </div>

      {/* GRID DE 4 ESTADÍSTICAS */}
      {stats && (
        <div className="stats-grid">

          {/* CLIENTES */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#EDE9FE' }}>
              <Users size={20} color="#7C3AED" />
            </div>
            <div className="stat-value">{stats.totalClientes}</div>
            <div className="stat-label">Clientes</div>
          </div>

          {/* SERVICIOS */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#EFF6FF' }}>
              <Package size={20} color="#3B82F6" />
            </div>
            <div className="stat-value">{stats.totalServicios}</div>
            <div className="stat-label">Servicios</div>
          </div>

          {/* MONTO PENDIENTE */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#FFF7ED' }}>
              <Clock size={20} color="#F97316" />
            </div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmt(stats.pendientes.total)}</div>
            <div className="stat-label">{stats.pendientes.cantidad} pendientes</div>
          </div>

          {/* MONTO COBRADO */}
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#F0FDF4' }}>
              <CheckCircle size={20} color="#22C55E" />
            </div>
            <div className="stat-value" style={{ fontSize: '1.1rem' }}>{fmt(stats.pagados.total)}</div>
            <div className="stat-label">{stats.pagados.cantidad} cobrados</div>
          </div>

        </div>
      )}

      {/* CARD: GENERAR PAGOS DEL MES */}
      <div className="card mb-24">
        <div className="flex items-center justify-between">
          <div>
            <h3 style={{ marginBottom: 4 }}>Generar pagos del mes</h3>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>Crea los cobros pendientes del periodo actual</p>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleGenerarPagos} disabled={generando}>
            <RefreshCw size={14} />
            {generando ? 'Generando...' : 'Generar'}
          </button>
        </div>
      </div>

      {/* SECCIÓN: PRÓXIMOS COBROS */}
      <p className="section-title">Próximos a cobrar</p>

      {pagosPendientes.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon"><CheckCircle size={28} /></div>
          <h3>Todo al día</h3>
          <p>No hay pagos pendientes en este momento</p>
        </div>
      ) : (
        <div className="desktop-grid-2">
        <div className="card" style={{ padding: '4px 0' }}>
          {pagosPendientes.map((pago) => (
            <div key={pago.id} className="list-item" style={{ padding: '14px 20px' }}>
              <div className="list-item-icon" style={{ background: '#FFF7ED' }}>
                <Clock size={18} color="#F97316" />
              </div>
              <div className="list-item-info">
                <h3>{pago.cliente_nombre}</h3>
                <p style={{ margin: 0, marginTop: 2 }}>{pago.servicio_nombre} · {pago.periodo}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 700, color: '#F97316', fontSize: '0.95rem' }}>
                  {fmt(pago.monto)}
                </div>
                <span className="badge badge-pendiente" style={{ marginTop: 4, display: 'inline-flex' }}>
                  pendiente
                </span>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}
    </>
  );
}

