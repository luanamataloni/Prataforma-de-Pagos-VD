// ============================================================
// CONTROLADOR DE CLIENTES
// ============================================================

// 1 - IMPORTO LA CONEXIÓN A LA DB Y EL SERVICIO DE FACTURAS:
const db            = require('../database/db');
const pagosService  = require('../services/facturaService');
const { sincronizarFacturaCliente } = pagosService;

// ── GET /clientes - LISTA TODOS LOS CLIENTES ──
const listarClientes = (req, res) => {
  try {
    // 1 - TRAIGO TODOS LOS CLIENTES CON SUS ESTADÍSTICAS:
    const clientes = db.prepare(`
      SELECT
        c.*,
        COUNT(DISTINCT cs.id)                                         AS total_servicios,
        COUNT(DISTINCT CASE WHEN p.estado = 'pendiente' THEN p.id END) AS pagos_pendientes
      FROM clientes c
      LEFT JOIN cliente_servicios cs ON cs.cliente_id = c.id
      LEFT JOIN pagos p ON p.cliente_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    res.json(clientes);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener clientes', detalle: error.message });
  }
};

// ── GET /clientes/:id - OBTIENE UN CLIENTE CON SUS SERVICIOS ──
const obtenerCliente = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - BUSCO EL CLIENTE POR ID:
    const cliente = db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // 2 - TRAIGO LOS SERVICIOS ASIGNADOS AL CLIENTE:
    const servicios = db.prepare(`
      SELECT s.*, cs.id AS asignacion_id, cs.fecha_asignacion
      FROM cliente_servicios cs
      JOIN servicios s ON s.id = cs.servicio_id
      WHERE cs.cliente_id = ?
      ORDER BY cs.fecha_asignacion DESC
    `).all(id);

    // 3 - DEVUELVO EL CLIENTE CON SUS SERVICIOS:
    res.json({ ...cliente, servicios });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cliente', detalle: error.message });
  }
};

// ── POST /clientes - CREA UN NUEVO CLIENTE ──
const crearCliente = (req, res) => {
  try {
    const { razon_social, cuit, direccion, email, telefono } = req.body;

    // 1 - VALIDO EL CAMPO REQUERIDO (Razón Social):
    if (!razon_social) return res.status(400).json({ error: 'La Razón Social es requerida' });

    // 2 - INSERTO EL CLIENTE EN LA DB:
    const resultado = db.prepare(`
      INSERT INTO clientes (razon_social, cuit, direccion, email, telefono)
      VALUES (?, ?, ?, ?, ?)
    `).run(razon_social, cuit || null, direccion || null, email || null, telefono || null);

    // 3 - DEVUELVO EL CLIENTE RECIÉN CREADO:
    const nuevoCliente = db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(resultado.lastInsertRowid);
    res.status(201).json(nuevoCliente);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente', detalle: error.message });
  }
};

// ── PUT /clientes/:id - ACTUALIZA UN CLIENTE ──
const actualizarCliente = (req, res) => {
  try {
    const { id } = req.params;
    const { razon_social, cuit, direccion, email, telefono } = req.body;

    // 1 - VERIFICO QUE EL CLIENTE EXISTE:
    const clienteExistente = db.prepare(`SELECT id FROM clientes WHERE id = ?`).get(id);
    if (!clienteExistente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // 2 - ACTUALIZO LOS DATOS DEL CLIENTE:
    db.prepare(`
      UPDATE clientes
      SET razon_social = COALESCE(?, razon_social),
          cuit         = COALESCE(?, cuit),
          direccion    = COALESCE(?, direccion),
          email        = COALESCE(?, email),
          telefono     = COALESCE(?, telefono)
      WHERE id = ?
    `).run(razon_social || null, cuit || null, direccion || null, email || null, telefono || null, id);

    // 3 - DEVUELVO EL CLIENTE ACTUALIZADO:
    const clienteActualizado = db.prepare(`SELECT * FROM clientes WHERE id = ?`).get(id);
    res.json(clienteActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cliente', detalle: error.message });
  }
};

// ── DELETE /clientes/:id - ELIMINA UN CLIENTE ──
const eliminarCliente = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - VERIFICO QUE EL CLIENTE EXISTE:
    const clienteExistente = db.prepare(`SELECT id FROM clientes WHERE id = ?`).get(id);
    if (!clienteExistente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // 2 - ELIMINO EL CLIENTE (CASCADE borra asignaciones y pagos):
    db.prepare(`DELETE FROM clientes WHERE id = ?`).run(id);

    res.json({ mensaje: 'Cliente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cliente', detalle: error.message });
  }
};

// ── POST /clientes/:id/servicios - ASIGNA UN SERVICIO A UN CLIENTE ──
const asignarServicio = (req, res) => {
  try {
    const { id }          = req.params;
    const { servicio_id } = req.body;

    // 1 - VALIDO QUE VENGAN LOS DATOS NECESARIOS:
    if (!servicio_id) return res.status(400).json({ error: 'servicio_id es requerido' });

    // 2 - VERIFICO QUE EL CLIENTE Y EL SERVICIO EXISTEN:
    const cliente  = db.prepare(`SELECT id FROM clientes  WHERE id = ?`).get(id);
    const servicio = db.prepare(`SELECT id FROM servicios WHERE id = ?`).get(servicio_id);
    if (!cliente)  return res.status(404).json({ error: 'Cliente no encontrado' });
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

    // 3 - VERIFICO QUE NO ESTÉ YA ASIGNADO:
    const asignacionExistente = db.prepare(`
      SELECT id FROM cliente_servicios WHERE cliente_id = ? AND servicio_id = ?
    `).get(id, servicio_id);
    if (asignacionExistente) return res.status(409).json({ error: 'El servicio ya está asignado a este cliente' });

    // 4 - CREO LA ASIGNACIÓN:
    db.prepare(`
      INSERT INTO cliente_servicios (cliente_id, servicio_id) VALUES (?, ?)
    `).run(id, servicio_id);

    // 5 - GENERO EL PRIMER PAGO AUTOMÁTICAMENTE:
    pagosService.generarPagoParaAsignacion(parseInt(id), parseInt(servicio_id));

    // 6 - SINCRONIZO / CREO LA FACTURA DEL PERÍODO PARA ESTE CLIENTE:
    // (crea una nueva o actualiza la existente con todos los servicios activos)
    sincronizarFacturaCliente(parseInt(id));

    res.status(201).json({ mensaje: 'Servicio asignado correctamente y factura actualizada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar servicio', detalle: error.message });
  }
};

// ── DELETE /clientes/:id/servicios/:servicioId - ELIMINA UNA ASIGNACIÓN ──
const quitarServicio = (req, res) => {
  try {
    const { id, servicioId } = req.params;

    // 1 - VERIFICO QUE EXISTE LA ASIGNACIÓN:
    const asignacion = db.prepare(`
      SELECT id FROM cliente_servicios WHERE cliente_id = ? AND servicio_id = ?
    `).get(id, servicioId);
    if (!asignacion) return res.status(404).json({ error: 'Asignación no encontrada' });

    // 2 - ELIMINO LOS PAGOS PENDIENTES DE ESTA ASIGNACIÓN:
    db.prepare(`
      DELETE FROM pagos
      WHERE cliente_id = ? AND servicio_id = ? AND estado = 'pendiente'
    `).run(id, servicioId);

    // 3 - ELIMINO LA ASIGNACIÓN:
    db.prepare(`
      DELETE FROM cliente_servicios WHERE cliente_id = ? AND servicio_id = ?
    `).run(id, servicioId);

    // 4 - SINCRONIZO LA FACTURA DEL PERÍODO (recalcula sin el servicio quitado):
    sincronizarFacturaCliente(parseInt(id));

    res.json({ mensaje: 'Servicio quitado del cliente correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al quitar servicio', detalle: error.message });
  }
};

// ── GET /clientes/:id/factura - OBTIENE LOS COBROS DE UN CLIENTE ──
const obtenerPagosCliente = (req, res) => {
  try {
    const { id } = req.params;
    const pagos = db.prepare(`
      SELECT p.*, s.nombre as servicio_nombre
      FROM pagos p
      JOIN servicios s ON p.servicio_id = s.id
      WHERE p.cliente_id = ?
      ORDER BY p.id DESC
    `).all(id);
    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener facturas', detalle: error.message });
  }
};

// 6 - EXPORTO LOS CONTROLADORES:
module.exports = {
  listarClientes,
  obtenerCliente,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
  asignarServicio,
  quitarServicio,
  obtenerPagosCliente
};

