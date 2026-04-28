// ============================================================
// PÁGINA: SERVICIOS - GESTIÓN DE SERVICIOS
// ============================================================

// 1 - IMPORTO REACT Y LOS HOOKS:
import { useState, useEffect } from 'react';

// 2 - IMPORTO LOS ÍCONOS:
import { Plus, Package, Pencil, Trash2 } from 'lucide-react';

// 3 - IMPORTO EL MODAL Y LA API:
import Modal from '../components/Modal';
import { getServicios, createServicio, updateServicio, deleteServicio } from '../api/index';

// 4 - ESTADO INICIAL DEL FORMULARIO:
const FORM_VACIO = { nombre: '', descripcion: '', precio: '', tipo_facturacion: 'mensual' };

export default function Servicios() {

  // 5 - DEFINO EL ESTADO LOCAL:
  const [servicios,     setServicios]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [modalAbierto,  setModalAbierto]  = useState(false);
  const [editando,      setEditando]      = useState(null); // null = crear, objeto = editar
  const [form,          setForm]          = useState(FORM_VACIO);
  const [guardando,     setGuardando]     = useState(false);

  // 6 - CARGO LOS SERVICIOS AL MONTAR:
  useEffect(() => { cargarServicios(); }, []);

  // 7 - FUNCIÓN QUE TRAE TODOS LOS SERVICIOS DE LA API:
  async function cargarServicios() {
    try {
      setLoading(true);
      const data = await getServicios();
      setServicios(data);
    } catch (err) {
      console.error('Error al cargar servicios:', err);
    } finally {
      setLoading(false);
    }
  }

  // 8 - ABRO EL MODAL PARA CREAR UN SERVICIO NUEVO:
  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setModalAbierto(true);
  }

  // 9 - ABRO EL MODAL PARA EDITAR UN SERVICIO EXISTENTE:
  function abrirEditar(servicio) {
    setEditando(servicio);
    setForm({
      nombre:          servicio.nombre,
      descripcion:     servicio.descripcion || '',
      precio:          String(servicio.precio),
      tipo_facturacion: servicio.tipo_facturacion,
    });
    setModalAbierto(true);
  }

  // 10 - GUARDO EL FORMULARIO (crear o editar según el caso):
  async function handleGuardar() {
    if (!form.nombre || !form.precio) {
      alert('Nombre y precio son obligatorios');
      return;
    }
    try {
      setGuardando(true);
      const payload = { ...form, precio: parseFloat(form.precio) };

      if (editando) {
        // 10a - ACTUALIZO EL SERVICIO EXISTENTE:
        await updateServicio(editando.id, payload);
      } else {
        // 10b - CREO UN SERVICIO NUEVO:
        await createServicio(payload);
      }

      setModalAbierto(false);
      cargarServicios();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  // 11 - ELIMINO UN SERVICIO PREVIA CONFIRMACIÓN:
  async function handleEliminar(servicio) {
    if (!confirm(`¿Eliminar "${servicio.nombre}"? Se borrarán sus pagos asociados.`)) return;
    try {
      await deleteServicio(servicio.id);
      cargarServicios();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 12 - ACTUALIZO EL ESTADO DEL FORMULARIO:
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // 13 - FORMATEO EL PRECIO:
  const fmt = (m) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(m);

  // 14 - PANTALLA DE CARGA:
  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><p>Cargando...</p></div>;

  // 15 - RENDERIZO LA PÁGINA:
  return (
    <>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Servicios</h1>
        <p>{servicios.length} servicio{servicios.length !== 1 ? 's' : ''} registrado{servicios.length !== 1 ? 's' : ''}</p>
      </div>

      {/* LISTA DE SERVICIOS */}
      {servicios.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon"><Package size={28} /></div>
          <h3>Sin servicios</h3>
          <p>Tocá el botón + para agregar tu primer servicio</p>
        </div>
      ) : (
        <div className="desktop-grid-2">
        <div className="card" style={{ padding: '4px 0' }}>
          {servicios.map((s) => (
            <div key={s.id} className="list-item" style={{ padding: '14px 20px' }}>

              {/* ÍCONO DEL SERVICIO */}
              <div className="list-item-icon" style={{ background: '#EFF6FF' }}>
                <Package size={18} color="#3B82F6" />
              </div>

              {/* INFO DEL SERVICIO */}
              <div className="list-item-info">
                <h3>{s.nombre}</h3>
                <div className="flex gap-8" style={{ marginTop: 4, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#7C3AED', fontSize: '0.9rem' }}>
                    {fmt(s.precio)}
                  </span>
                  <span className={`badge badge-${s.tipo_facturacion}`}>
                    {s.tipo_facturacion}
                  </span>
                </div>
                {s.descripcion && (
                  <p style={{ margin: 0, marginTop: 2, fontSize: '0.78rem' }}>{s.descripcion}</p>
                )}
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="list-item-actions">
                <button className="btn-icon" onClick={() => abrirEditar(s)} title="Editar">
                  <Pencil size={15} />
                </button>
                <button className="btn-icon" onClick={() => handleEliminar(s)} title="Eliminar"
                  style={{ color: '#EF4444' }}>
                  <Trash2 size={15} />
                </button>
              </div>

            </div>
          ))}
        </div>
        </div>
      )}

      {/* FAB: BOTÓN FLOTANTE PARA AGREGAR */}
      <button className="fab" onClick={abrirCrear} title="Nuevo servicio">
        <Plus size={24} />
      </button>

      {/* MODAL: FORMULARIO DE SERVICIO */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={editando ? 'Editar servicio' : 'Nuevo servicio'}
      >
        {/* NOMBRE */}
        <div className="form-group">
          <label>Nombre *</label>
          <input
            name="nombre"
            value={form.nombre}
            onChange={handleChange}
            placeholder="Ej: Hosting básico"
          />
        </div>

        {/* DESCRIPCIÓN */}
        <div className="form-group">
          <label>Descripción</label>
          <input
            name="descripcion"
            value={form.descripcion}
            onChange={handleChange}
            placeholder="Descripción opcional"
          />
        </div>

        {/* PRECIO */}
        <div className="form-group">
          <label>Precio *</label>
          <input
            name="precio"
            type="number"
            value={form.precio}
            onChange={handleChange}
            placeholder="Ej: 5000"
            min="0"
          />
        </div>

        {/* TIPO DE FACTURACIÓN */}
        <div className="form-group">
          <label>Facturación *</label>
          <select name="tipo_facturacion" value={form.tipo_facturacion} onChange={handleChange}>
            <option value="mensual">Mensual</option>
            <option value="anual">Anual</option>
          </select>
        </div>

        {/* BOTONES DEL MODAL */}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setModalAbierto(false)}>
            Cancelar
          </button>
          <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando}>
            {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear servicio'}
          </button>
        </div>
      </Modal>
    </>
  );
}

