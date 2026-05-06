// ============================================================
// PÁGINA: CLIENTES - GESTIÓN DE CLIENTES Y SUS SERVICIOS
// ============================================================

// 1 - IMPORTO REACT Y LOS HOOKS:
import { useState, useEffect } from 'react';

// 2 - IMPORTO LOS ÍCONOS:
import { Plus, Users, Pencil, Trash2, ChevronDown, ChevronUp, Package, X, Camera, ShieldCheck, ShieldOff, KeyRound } from 'lucide-react';

// 3 - IMPORTO EL MODAL Y LA API:
import Modal from '../components/Modal';
import {
  getClientes, getCliente, createCliente, updateCliente, deleteCliente,
  getServicios, asignarServicio, quitarServicio
} from '../api/index';

// 4 - ESTADO INICIAL DEL FORMULARIO:
const FORM_VACIO = {
  razon_social:  '',
  cuit:          '',
  direccion:     '',
  email:         '',
  telefono:      '',
  // CAMPOS DE ACCESO AL PORTAL (opcionales):
  crear_acceso:  false,
  user_email:    '',
  user_password: ''
};

export default function Clientes() {

  // 5 - DEFINO EL ESTADO LOCAL:
  const [clientes,       setClientes]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [modalAbierto,   setModalAbierto]   = useState(false);
  const [modalServicios, setModalServicios] = useState(false);
  const [editando,       setEditando]       = useState(null);
  const [clienteActivo,  setClienteActivo]  = useState(null); // para asignar servicios
  const [expandido,      setExpandido]      = useState(null); // id del cliente expandido
  const [form,           setForm]           = useState(FORM_VACIO);
  const [fotoFile,       setFotoFile]       = useState(null);
  const [preview,        setPreview]        = useState(null);
  const [guardando,      setGuardando]      = useState(false);
  const [serviciosTodos, setServiciosTodos] = useState([]);
  const [detalleCliente, setDetalleCliente] = useState(null);

  // 6 - CARGO LOS CLIENTES AL MONTAR:
  useEffect(() => { cargarClientes(); }, []);

  // 7 - FUNCIÓN QUE TRAE TODOS LOS CLIENTES:
  async function cargarClientes() {
    try {
      setLoading(true);
      const data = await getClientes();
      setClientes(data);
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setLoading(false);
    }
  }

  // 8 - EXPANDO O COLAPSO UN CLIENTE PARA VER SUS SERVICIOS:
  async function toggleExpandido(cliente) {
    if (expandido === cliente.id) {
      setExpandido(null);
      setDetalleCliente(null);
      return;
    }
    try {
      const detalle = await getCliente(cliente.id);
      setDetalleCliente(detalle);
      setExpandido(cliente.id);
    } catch (err) {
      console.error('Error al cargar detalle del cliente:', err);
    }
  }

  // 9 - ABRO EL MODAL PARA CREAR UN CLIENTE:
  function abrirCrear() {
    setEditando(null);
    setForm(FORM_VACIO);
    setFotoFile(null);
    setPreview(null);
    setModalAbierto(true);
  }

  // 10 - ABRO EL MODAL PARA EDITAR UN CLIENTE:
  function abrirEditar(cliente) {
    setEditando(cliente);
    setForm({
      razon_social:  cliente.razon_social  || '',
      cuit:          cliente.cuit          || '',
      direccion:     cliente.direccion     || '',
      email:         cliente.email         || '',
      telefono:      cliente.telefono      || '',
      // SI YA TIENE ACCESO AL PORTAL, MUESTRO LA SECCIÓN PRE-COMPLETADA:
      crear_acceso:  !!cliente.tiene_acceso,
      user_email:    cliente.user_email    || '',
      user_password: ''  // NUNCA pre-relleno la contraseña por seguridad
    });
    setFotoFile(null);
    setPreview(cliente.foto_perfil ? `http://localhost:3001${cliente.foto_perfil}` : null);
    setModalAbierto(true);
  }

  // 11 - ABRO EL MODAL PARA ASIGNAR SERVICIOS:
  async function abrirAsignarServicios(cliente) {
    try {
      const [detalle, todos] = await Promise.all([getCliente(cliente.id), getServicios()]);
      setDetalleCliente(detalle);
      setClienteActivo(cliente);
      setServiciosTodos(todos);
      setModalServicios(true);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 12 - GUARDO EL FORMULARIO (crear o editar):
  async function handleGuardar() {
    if (!form.razon_social) { alert('La razón social es obligatoria'); return; }
    try {
      setGuardando(true);

      // PREPARO LOS DATOS (FormData solo si hay foto, si no JSON normal)
      let dataToSend;
      if (fotoFile) {
        dataToSend = new FormData();
        // APPENDEO CADA CAMPO DEL FORM AL FORMDATA:
        Object.entries(form).forEach(([key, val]) => {
          // crear_acceso es boolean, lo convierto a string para que el backend lo lea bien:
          dataToSend.append(key, String(val));
        });
        dataToSend.append('foto', fotoFile);
      } else {
        dataToSend = form;
      }

      if (editando) {
        // 12a - ACTUALIZO EL CLIENTE EXISTENTE:
        await updateCliente(editando.id, dataToSend);
      } else {
        // 12b - CREO UN CLIENTE NUEVO:
        await createCliente(dataToSend);
      }
      setModalAbierto(false);
      cargarClientes();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  // 13 - ELIMINO UN CLIENTE PREVIA CONFIRMACIÓN:
  async function handleEliminar(cliente) {
    if (!confirm(`¿Eliminar a "${cliente.razon_social}"? Se borrarán sus pagos y asignaciones.`)) return;
    try {
      await deleteCliente(cliente.id);
      cargarClientes();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 14 - ASIGNO UN SERVICIO AL CLIENTE ACTIVO:
  async function handleAsignar(servicioId) {
    try {
      await asignarServicio(clienteActivo.id, servicioId);
      const detalle = await getCliente(clienteActivo.id);
      setDetalleCliente(detalle);
      cargarClientes();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 15 - QUITO UN SERVICIO DEL CLIENTE ACTIVO:
  async function handleQuitarServicio(servicioId) {
    if (!confirm('¿Quitar este servicio? Se eliminarán sus pagos pendientes.')) return;
    try {
      await quitarServicio(clienteActivo.id, servicioId);
      const detalle = await getCliente(clienteActivo.id);
      setDetalleCliente(detalle);
      cargarClientes();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  // 16 - ACTUALIZO EL ESTADO DEL FORMULARIO:
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  // 17 - PANTALLA DE CARGA:
  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><p>Cargando...</p></div>;

  // 18 - IDs DE SERVICIOS YA ASIGNADOS AL CLIENTE ACTIVO:
  const idsAsignados = detalleCliente?.servicios?.map(s => s.id) ?? [];

  // 19 - RENDERIZO LA PÁGINA:
  return (
    <>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Clientes</h1>
        <p>{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} registrado{clientes.length !== 1 ? 's' : ''}</p>
      </div>

      {/* LISTA DE CLIENTES */}
      {clientes.length === 0 ? (
        <div className="empty-state">
          <div className="es-icon"><Users size={28} /></div>
          <h3>Sin clientes</h3>
          <p>Tocá el botón + para agregar tu primer cliente</p>
        </div>
      ) : (
        <div className="desktop-grid-2">
          {clientes.map((c) => (
            <div key={c.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>

              {/* FILA PRINCIPAL DEL CLIENTE */}
              <div className="flex items-center gap-12" style={{ padding: '16px 20px' }}>

                {/* AVATAR */}
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: '#EDE9FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {c.foto_perfil ? (
                    <img
                      src={`http://localhost:3001${c.foto_perfil}`}
                      alt={c.razon_social}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <Users size={18} color="#7C3AED" />
                  )}
                </div>

                {/* INFO */}
                <div className="list-item-info" onClick={() => toggleExpandido(c)} style={{ cursor: 'pointer' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.razon_social}
                    {/* INDICADOR DE ACCESO AL PORTAL */}
                    {c.tiene_acceso ? (
                      <span title={`Acceso: ${c.user_email}`} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: '#DCFCE7', color: '#15803D',
                        borderRadius: 99, padding: '1px 8px', fontSize: '0.68rem', fontWeight: 700
                      }}>
                        <ShieldCheck size={11} /> Portal
                      </span>
                    ) : (
                      <span title="Sin acceso al portal" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        background: '#F3F4F6', color: '#9CA3AF',
                        borderRadius: 99, padding: '1px 8px', fontSize: '0.68rem', fontWeight: 600
                      }}>
                        <ShieldOff size={11} /> Sin acceso
                      </span>
                    )}
                  </h3>
                  <p style={{ margin: 0, marginTop: 2 }}>
                    {c.total_servicios} servicio{c.total_servicios !== 1 ? 's' : ''}
                    {c.pagos_pendientes > 0 && (
                      <span className="badge badge-pendiente" style={{ marginLeft: 8 }}>
                        {c.pagos_pendientes} pendiente{c.pagos_pendientes !== 1 ? 's' : ''}
                      </span>
                    )}
                  </p>
                </div>

                {/* BOTONES */}
                <div className="list-item-actions">
                  <button className="btn-icon" onClick={() => abrirEditar(c)} title="Editar">
                    <Pencil size={15} />
                  </button>
                  <button className="btn-icon" onClick={() => handleEliminar(c)} title="Eliminar"
                    style={{ color: '#EF4444' }}>
                    <Trash2 size={15} />
                  </button>
                  <button className="btn-icon" onClick={() => toggleExpandido(c)}>
                    {expandido === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* PANEL EXPANDIDO: SERVICIOS DEL CLIENTE */}
              {expandido === c.id && detalleCliente && (
                <div style={{
                  borderTop: '1px solid #E5E7EB',
                  background: '#F9FAFB',
                  padding: '12px 20px 16px'
                }}>
                  <div className="flex items-center justify-between mb-8">
                    <p className="section-title" style={{ margin: 0 }}>Servicios asignados</p>
                    <button className="btn btn-secondary btn-sm" onClick={() => abrirAsignarServicios(c)}>
                      <Package size={13} /> Gestionar
                    </button>
                  </div>

                  {detalleCliente.servicios.length === 0 ? (
                    <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Sin servicios asignados</p>
                  ) : (
                    detalleCliente.servicios.map((s) => (
                      <div key={s.id} className="flex items-center gap-8" style={{ marginBottom: 6 }}>
                        <Package size={14} color="#3B82F6" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{s.nombre}</span>
                        <span className={`badge badge-${s.tipo_facturacion}`}>{s.tipo_facturacion}</span>
                      </div>
                    ))
                  )}

                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed #E5E7EB', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {c.cuit && <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>🆔 <b>CUIT:</b> {c.cuit}</p>}
                    {c.direccion && <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>📍 <b>Dirección:</b> {c.direccion}</p>}
                    {c.email && <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>📧 <b>Email:</b> {c.email}</p>}
                    {c.telefono && <p style={{ fontSize: '0.78rem', color: '#6B7280' }}>📞 <b>Teléfono:</b> {c.telefono}</p>}
                    {/* ACCESO AL PORTAL */}
                    {c.tiene_acceso
                      ? <p style={{ fontSize: '0.78rem', color: '#15803D' }}>🔐 <b>Acceso portal:</b> {c.user_email}</p>
                      : <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>🔒 Sin acceso al portal</p>
                    }
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* FAB: BOTÓN FLOTANTE PARA AGREGAR */}
      <button className="fab" onClick={abrirCrear} title="Nuevo cliente">
        <Plus size={24} />
      </button>

      {/* MODAL: FORMULARIO CREAR / EDITAR CLIENTE */}
      <Modal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={editando ? 'Editar cliente' : 'Nuevo cliente'}
      >
        <div onClick={(e) => e.stopPropagation()}>
          {/* CARGA DE FOTO */}
          <div className="flex flex-col items-center mb-20">
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#F3F4F6',
              border: '2px dashed #D1D5DB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              cursor: 'pointer'
            }} onClick={() => document.getElementById('foto-input').click()}>
              {preview ? (
                <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Vista previa" />
              ) : (
                <Camera size={24} color="#9CA3AF" />
              )}
              <div style={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                padding: '2px 0',
                textAlign: 'center'
              }}>
                <Plus size={12} color="white" />
              </div>
            </div>
            <input
              id="foto-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <p style={{ fontSize: '0.7rem', color: '#6B7280', marginTop: 8 }}>Foto de perfil (opcional)</p>
          </div>

          <div className="form-group">
            <label>Nombre Razón Social *</label>
            <input name="razon_social" value={form.razon_social} onChange={handleChange} placeholder="Nombre legal de la empresa o cliente" />
          </div>
          <div className="form-group">
            <label>CUIT</label>
            <input name="cuit" value={form.cuit} onChange={handleChange} placeholder="Número de CUIT" />
          </div>
          <div className="form-group">
            <label>Dirección</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} placeholder="Dirección física" />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 11 2345-6789" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="correo@ejemplo.com" />
          </div>

          {/* ── SECCIÓN: ACCESO AL PORTAL ── */}
          <div style={{
            border: '1.5px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            marginBottom: 16,
            background: form.crear_acceso ? '#F0FDF4' : 'var(--bg-secondary)',
            transition: 'background 0.2s'
          }}>
            {/* TOGGLE: ACTIVAR/DESACTIVAR ACCESO */}
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                setForm({ ...form, crear_acceso: !form.crear_acceso });
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <KeyRound size={16} color={form.crear_acceso ? '#15803D' : '#9CA3AF'} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: form.crear_acceso ? '#15803D' : 'var(--text-primary)' }}>
                    {editando?.tiene_acceso ? 'Modificar acceso al portal' : 'Crear acceso al portal'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: 2 }}>
                    {editando?.tiene_acceso
                      ? 'El cliente ya tiene acceso. Activá para cambiar sus credenciales.'
                      : 'El cliente podrá ver sus facturas con estos datos.'}
                  </div>
                </div>
              </div>
              {/* TOGGLE VISUAL */}
              <div style={{
                width: 42, height: 24, borderRadius: 99,
                background: form.crear_acceso ? '#22C55E' : '#D1D5DB',
                position: 'relative', transition: 'background 0.2s', flexShrink: 0
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: form.crear_acceso ? 21 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
              </div>
            </div>

            {/* CAMPOS DE ACCESO (visibles solo cuando el toggle está ON) */}
            {form.crear_acceso && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* ACLARACIÓN: EMAIL DE ACCESO vs EMAIL DE CONTACTO */}
                <div style={{
                  background: '#DBEAFE', borderRadius: 'var(--radius-md)',
                  padding: '8px 12px', fontSize: '0.75rem', color: '#1D4ED8'
                }}>
                  📌 <b>Email de acceso</b> (credenciales de login) puede ser distinto al email de contacto del cliente.
                </div>

                {/* EMAIL DE ACCESO */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>Email de acceso *</label>
                  <input
                    name="user_email"
                    type="email"
                    value={form.user_email}
                    onChange={handleChange}
                    placeholder="acceso@ejemplo.com"
                  />
                </div>

                {/* CONTRASEÑA */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '0.78rem' }}>
                    {editando?.tiene_acceso ? 'Nueva contraseña (dejá vacío para no cambiarla)' : 'Contraseña *'}
                  </label>
                  <input
                    name="user_password"
                    type="password"
                    value={form.user_password}
                    onChange={handleChange}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setModalAbierto(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleGuardar} disabled={guardando}>
              {guardando ? 'Guardando...' : editando ? 'Guardar cambios' : 'Crear cliente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* MODAL: GESTIONAR SERVICIOS DEL CLIENTE */}
      <Modal
        isOpen={modalServicios}
        onClose={() => setModalServicios(false)}
        title={`Servicios de ${clienteActivo?.razon_social ?? ''}`}
      >
        <div onClick={(e) => e.stopPropagation()}>
          {/* SERVICIOS YA ASIGNADOS */}
          <p className="section-title">Asignados</p>
          {idsAsignados.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: 16 }}>Sin servicios</p>
          ) : (
            detalleCliente?.servicios?.map((s) => (
              <div key={s.id} className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-8">
                  <Package size={15} color="#3B82F6" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{s.nombre}</span>
                  <span className={`badge badge-${s.tipo_facturacion}`}>{s.tipo_facturacion}</span>
                </div>
                <button className="btn-icon" onClick={() => handleQuitarServicio(s.id)}
                  style={{ color: '#EF4444' }} title="Quitar">
                  <X size={15} />
                </button>
              </div>
            ))
          )}

          {/* SERVICIOS DISPONIBLES PARA ASIGNAR */}
          <p className="section-title" style={{ marginTop: 20 }}>Disponibles para asignar</p>
          {serviciosTodos.filter(s => !idsAsignados.includes(s.id)).length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Todos los servicios ya están asignados</p>
          ) : (
            serviciosTodos
              .filter(s => !idsAsignados.includes(s.id))
              .map((s) => (
                <div key={s.id} className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-8">
                    <Package size={15} color="#9CA3AF" />
                    <span style={{ fontSize: '0.875rem' }}>{s.nombre}</span>
                    <span className={`badge badge-${s.tipo_facturacion}`}>{s.tipo_facturacion}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleAsignar(s.id)}>
                    <Plus size={12} /> Asignar
                  </button>
                </div>
              ))
          )}

          <div className="modal-actions">
            <button className="btn btn-primary w-full" onClick={() => setModalServicios(false)}>
              Listo
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
