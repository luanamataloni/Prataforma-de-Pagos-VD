// ============================================================
// API - TODAS LAS LLAMADAS AL BACKEND
// ============================================================

// 1 - DEFINO LA URL BASE DEL BACKEND (proxy configurado en vite.config.js):
const BASE = '/api';

// ── HELPER: REALIZO UNA PETICIÓN Y PROCESO LA RESPUESTA ──
async function request(url, options = {}) {
  const response = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error HTTP ${response.status}`);
  }

  return response.json();
}

// ══════════════════ SERVICIOS ══════════════════

// 2 - OBTENGO TODOS LOS SERVICIOS:
export const getServicios   = ()         => request('/servicios');

// 3 - CREO UN SERVICIO:
export const createServicio = (data)     => request('/servicios', { method: 'POST', body: JSON.stringify(data) });

// 4 - ACTUALIZO UN SERVICIO:
export const updateServicio = (id, data) => request(`/servicios/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// 5 - ELIMINO UN SERVICIO:
export const deleteServicio = (id)       => request(`/servicios/${id}`, { method: 'DELETE' });

// ══════════════════ CLIENTES ══════════════════

// 6 - OBTENGO TODOS LOS CLIENTES:
export const getClientes   = ()         => request('/clientes');

// 7 - OBTENGO UN CLIENTE CON SUS SERVICIOS:
export const getCliente    = (id)       => request(`/clientes/${id}`);

// 8 - CREO UN CLIENTE:
export const createCliente = (data)     => request('/clientes', { method: 'POST', body: JSON.stringify(data) });

// 9 - ACTUALIZO UN CLIENTE:
export const updateCliente = (id, data) => request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// 10 - ELIMINO UN CLIENTE:
export const deleteCliente = (id)       => request(`/clientes/${id}`, { method: 'DELETE' });

// 11 - ASIGNO UN SERVICIO A UN CLIENTE:
export const asignarServicio = (clienteId, servicioId) =>
  request(`/clientes/${clienteId}/servicios`, { method: 'POST', body: JSON.stringify({ servicio_id: servicioId }) });

// 12 - QUITO UN SERVICIO DE UN CLIENTE:
export const quitarServicio = (clienteId, servicioId) =>
  request(`/clientes/${clienteId}/servicios/${servicioId}`, { method: 'DELETE' });

// 13 - OBTENGO LOS PAGOS DE UN CLIENTE:
export const getPagosDeCliente = (clienteId) => request(`/clientes/${clienteId}/pagos`);

// ══════════════════ PAGOS ══════════════════

// 14 - OBTENGO TODOS LOS PAGOS (con filtros opcionales):
export const getPagos = (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.estado)     params.append('estado',     filtros.estado);
  if (filtros.cliente_id) params.append('cliente_id', filtros.cliente_id);
  const query = params.toString();
  return request(`/pagos${query ? `?${query}` : ''}`);
};

// 15 - ACTUALIZO UN PAGO (marcar como pagado, etc.):
export const updatePago = (id, data) => request(`/pagos/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// 16 - GENERO LOS PAGOS PENDIENTES DEL PERIODO:
export const generarPagos = () => request('/pagos/generar', { method: 'POST' });

// 17 - OBTENGO LAS ESTADÍSTICAS GENERALES:
export const getStats = () => request('/pagos/stats');

// 18 - SUBIDA DE ARCHIVOS (COMPROBANTES):
export const uploadComprobante = async (id, file) => {
  const formData = new FormData();
  formData.append('comprobante', file);

  // NOTA: Para FormData no enviamos Content-Type manual, el navegador lo pone solo con el boundary
  const response = await fetch(`${BASE}/pagos/${id}/upload`, {
    method: 'POST',
    body: formData
    // No ponemos headers aquí para que el navegador maneje el boundary automáticamente
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error HTTP ${response.status}`);
  }

  return response.json();
};
