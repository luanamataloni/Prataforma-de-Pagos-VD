// ============================================================
// PÁGINA: PERFIL DEL PROVEEDOR - DATOS DEL ADMINISTRADOR
// ============================================================

// 1 - IMPORTO REACT Y LOS ÍCONOS:
import { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, Mail } from 'lucide-react';

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

// 3 - FORMULARIO VACÍO:
const FORM_VACIO = {
  razon_social: '',
  rubro:        '',
  cuit:         '',
  direccion:    '',
  telefono:     '',
  mail_envio:   ''
};

export default function Perfil() {

  // 4 - ESTADOS:
  const [form,     setForm]     = useState({ ...FORM_VACIO });
  const [loading,  setLoading]  = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado,  setGuardado]  = useState(false);

  // 5 - CARGO LOS DATOS AL MONTAR:
  useEffect(() => { cargarConfiguracion(); }, []);

  // 6 - TRAIGO LA CONFIGURACIÓN DEL PROVEEDOR:
  async function cargarConfiguracion() {
    try {
      setLoading(true);
      const config = await req('/configuracion');
      setForm({
        razon_social: config.razon_social || '',
        rubro:        config.rubro        || '',
        cuit:         config.cuit         || '',
        direccion:    config.direccion     || '',
        telefono:     config.telefono      || '',
        mail_envio:   config.mail_envio    || ''
      });
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    } finally {
      setLoading(false);
    }
  }

  // 7 - GUARDO LOS CAMBIOS EN EL BACKEND:
  async function handleGuardar(e) {
    e.preventDefault();
    try {
      setGuardando(true);
      setGuardado(false);

      // 7a - ENVÍO LOS DATOS AL ENDPOINT:
      await req('/configuracion', {
        method: 'PUT',
        body: JSON.stringify(form)
      });

      // 7b - MUESTRO INDICADOR DE ÉXITO POR 3 SEGUNDOS:
      setGuardado(true);
      setTimeout(() => setGuardado(false), 3000);

    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setGuardando(false);
    }
  }

  // 8 - PANTALLA DE CARGA:
  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><p>Cargando...</p></div>;

  // 9 - RENDERIZO LA PÁGINA:
  return (
    <>
      {/* CABECERA */}
      <div className="page-header">
        <h1>Perfil del Proveedor</h1>
        <p>Estos datos aparecerán en las facturas generadas</p>
      </div>

      {/* FORMULARIO DE DATOS DEL PROVEEDOR */}
      <div className="card" style={{ maxWidth: 560 }}>

        {/* ÍCONO + TÍTULO DE LA SECCIÓN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--color-primary-light)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <Building2 size={22} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
              Datos de Proveedor
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              Información legal y de contacto
            </div>
          </div>
        </div>

        {/* CAMPO: RAZÓN SOCIAL */}
        <form onSubmit={handleGuardar}>

          <div className="form-group">
            <label>Razón Social *</label>
            <input
              type="text"
              placeholder="Ej: VIEW DEVS"
              value={form.razon_social}
              onChange={e => setForm({ ...form, razon_social: e.target.value })}
            />
          </div>

          {/* CAMPO: RUBRO */}
          <div className="form-group">
            <label>Rubro</label>
            <input
              type="text"
              placeholder="Ej: SERVICIOS INFORMÁTICOS"
              value={form.rubro}
              onChange={e => setForm({ ...form, rubro: e.target.value })}
            />
          </div>

          {/* CAMPO: CUIT */}
          <div className="form-group">
            <label>CUIT</label>
            <input
              type="text"
              placeholder="Ej: 20-37557878-7"
              value={form.cuit}
              onChange={e => setForm({ ...form, cuit: e.target.value })}
            />
          </div>

          {/* CAMPO: DIRECCIÓN */}
          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              placeholder="Ej: FREY 468"
              value={form.direccion}
              onChange={e => setForm({ ...form, direccion: e.target.value })}
            />
          </div>

          {/* CAMPO: TELÉFONO */}
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="text"
              placeholder="Ej: +34 654 754 543"
              value={form.telefono}
              onChange={e => setForm({ ...form, telefono: e.target.value })}
            />
          </div>

          {/* SEPARADOR VISUAL */}
          <div style={{
            borderTop: '1.5px dashed var(--border-color)',
            margin: '20px 0 20px',
          }} />

          {/* SECCIÓN: CONFIGURACIÓN DE MAIL */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36,
              background: 'var(--color-primary-light)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Mail size={18} color="var(--color-primary)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Correo de envío
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Desde este mail salen los recordatorios y facturas a los clientes
              </div>
            </div>
          </div>

          {/* CAMPO: MAIL DE ENVÍO */}
          <div className="form-group">
            <label>Mail de envío de recordatorios *</label>
            <input
              type="email"
              placeholder="Ej: pagos@miempresa.com"
              value={form.mail_envio}
              onChange={e => setForm({ ...form, mail_envio: e.target.value })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
              ⚠️ Este mail debe coincidir con el <code>SMTP_USER</code> configurado en el servidor para que el envío funcione correctamente.
            </span>
          </div>

          {/* BOTÓN GUARDAR + MENSAJE DE ÉXITO */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={guardando}
            >
              <Save size={15} />
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>

            {/* INDICADOR DE GUARDADO EXITOSO */}
            {guardado && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'var(--color-green)', fontSize: '0.84rem', fontWeight: 600
              }}>
                <CheckCircle size={15} />
                ¡Guardado correctamente!
              </span>
            )}
          </div>

        </form>
      </div>
    </>
  );
}

