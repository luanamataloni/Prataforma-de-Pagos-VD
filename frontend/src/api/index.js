// ============================================================
// API - TODAS LAS LLAMADAS AL BACKEND
// ============================================================

// 1 - DEFINO LA URL BASE DEL BACKEND (proxy configurado en vite.config.js):
const BASE = '/api';

// ── HELPER: OBTENGO EL TOKEN DEL localStorage ──
function getToken() {
  return localStorage.getItem('auth_token');
}

// ── HELPER: REALIZO UNA PETICIÓN Y PROCESO LA RESPUESTA ──
async function request(url, options = {}) {
  const token = getToken();
  const defaultHeaders = { 'Content-Type': 'application/json' };
  if (token) defaultHeaders['Authorization'] = `Bearer ${token}`;

  const response = await fetch(`${BASE}${url}`, {
    ...options,
    headers: { ...defaultHeaders, ...(options.headers || {}) }
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

// 8 - CREO UN CLIENTE (con opción de acceso al portal):
export const createCliente = (data) => {
  // 37 - SI LOS DATOS SON FormData (para archivos), NO usamos el helper request estándar:
  if (data instanceof FormData) {
    const token = getToken();
    return fetch(`${BASE}/clientes`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: data
    }).then(res => res.json().then(json => {
      if (!res.ok) throw new Error(json.error || `Error HTTP ${res.status}`);
      return json;
    }));
  }
  return request('/clientes', { method: 'POST', body: JSON.stringify(data) });
};

// 9 - ACTUALIZO UN CLIENTE (con opción de acceso al portal):
export const updateCliente = (id, data) => {
  if (data instanceof FormData) {
    const token = getToken();
    return fetch(`${BASE}/clientes/${id}`, {
      method: 'PUT',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: data
    }).then(res => res.json().then(json => {
      if (!res.ok) throw new Error(json.error || `Error HTTP ${res.status}`);
      return json;
    }));
  }
  return request(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(data) });
};

// 10 - ELIMINO UN CLIENTE:
export const deleteCliente = (id)       => request(`/clientes/${id}`, { method: 'DELETE' });

// 11 - ASIGNO UN SERVICIO A UN CLIENTE:
export const asignarServicio = (clienteId, servicioId) =>
  request(`/clientes/${clienteId}/servicios`, { method: 'POST', body: JSON.stringify({ servicio_id: servicioId }) });

// 12 - QUITO UN SERVICIO DE UN CLIENTE:
export const quitarServicio = (clienteId, servicioId) =>
  request(`/clientes/${clienteId}/servicios/${servicioId}`, { method: 'DELETE' });

// 13 - OBTENGO LAS FACTURAS DE UN CLIENTE:
export const getPagosDeCliente = (clienteId) => request(`/clientes/${clienteId}/factura`);

// ══════════════════ FACTURAS ══════════════════

// 14 - OBTENGO TODAS LAS FACTURAS (con filtros opcionales):
export const getPagos = (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.estado)     params.append('estado',     filtros.estado);
  if (filtros.cliente_id) params.append('cliente_id', filtros.cliente_id);
  const query = params.toString();
  return request(`/factura${query ? `?${query}` : ''}`);
};

// 15 - ACTUALIZO UNA FACTURA (marcar como pagado, etc.):
export const updatePago = (id, data) => request(`/factura/${id}`, { method: 'PUT', body: JSON.stringify(data) });

// 16 - GENERO LAS FACTURAS PENDIENTES DEL PERIODO:
export const generarPagos = () => request('/factura/generar', { method: 'POST' });

// 17 - OBTENGO LAS ESTADÍSTICAS GENERALES:
export const getStats = () => request('/factura/stats');

// 18 - SUBIDA DE ARCHIVOS (COMPROBANTES):
export const uploadComprobante = async (id, file) => {
  const formData = new FormData();
  formData.append('comprobante', file);

  // NOTA: Para FormData no enviamos Content-Type manual, el navegador lo pone solo con el boundary
  const token = getToken();
  const response = await fetch(`${BASE}/factura/${id}/upload`, {
    method: 'POST',
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error HTTP ${response.status}`);
  }

  return response.json();
};

// ══════════════════ PORTAL DE FACTURAS ══════════════════

// 19 - TRAIGO LA FACTURA DEL PERIODO ACTUAL (cliente):
export const getFacturaPeriodoActual = () => request('/facturas-portal/periodo-actual');

// 20 - LISTO TODAS LAS FACTURAS DEL PORTAL (admin: todas | cliente: las suyas):
export const getFacturasPortal = () => request('/facturas-portal');

// 21 - CREO UNA NUEVA FACTURA CON DETALLE (admin only):
export const crearFacturaPortal = (data) => request('/facturas-portal', { method: 'POST', body: JSON.stringify(data) });

// 22 - MARCO UNA FACTURA COMO PAGADA:
export const pagarFactura = (id) => request(`/facturas-portal/${id}/pagar`, { method: 'PUT' });

// ══════════════════ CLIENTES DEL PORTAL ══════════════════

// 23 - LISTO LOS CLIENTES DEL PORTAL (admin only):
export const getClientsPortal = () => request('/portal/clients');

// 24 - CREO UN CLIENTE CON SU CUENTA DE USUARIO (admin only):
export const createClientPortal = (data) => request('/portal/clients', { method: 'POST', body: JSON.stringify(data) });


