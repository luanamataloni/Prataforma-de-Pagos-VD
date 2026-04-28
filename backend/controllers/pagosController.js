// ============================================================
// CONTROLADOR DE PAGOS
// ============================================================

// 1 - IMPORTO LA CONEXIÓN A LA DB Y EL SERVICIO DE PAGOS:
const db           = require('../database/db');
const pagosService = require('../services/pagosService');

// ── GET /pagos - LISTA TODOS LOS PAGOS (CON FILTROS OPCIONALES) ──
const listarPagos = (req, res) => {
  try {
    const { estado, cliente_id } = req.query;

    // 1 - CONSTRUYO LA QUERY CON LOS FILTROS QUE VENGAN:
    let query = `
      SELECT
        p.*,
        c.razon_social AS cliente_nombre,
        s.nombre AS servicio_nombre
      FROM pagos p
      JOIN clientes  c ON c.id = p.cliente_id
      JOIN servicios s ON s.id = p.servicio_id
      WHERE 1=1
    `;
    const params = [];

    if (estado) {
      query += ` AND p.estado = ?`;
      params.push(estado);
    }
    if (cliente_id) {
      query += ` AND p.cliente_id = ?`;
      params.push(cliente_id);
    }

    query += ` ORDER BY p.periodo DESC, c.razon_social ASC`;

    // 2 - EJECUTO LA QUERY:
    const pagos = db.prepare(query).all(...params);

    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pagos', detalle: error.message });
  }
};

// ── GET /clientes/:id/pagos - PAGOS DE UN CLIENTE ESPECÍFICO ──
const listarPagosDeCliente = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - VERIFICO QUE EL CLIENTE EXISTA:
    const cliente = db.prepare(`SELECT id FROM clientes WHERE id = ?`).get(id);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // 2 - TRAIGO LOS PAGOS DEL CLIENTE CON INFO DEL SERVICIO:
    const pagos = db.prepare(`
      SELECT
        p.*,
        s.nombre AS servicio_nombre,
        s.tipo_facturacion
      FROM pagos p
      JOIN servicios s ON s.id = p.servicio_id
      WHERE p.cliente_id = ?
      ORDER BY p.periodo DESC
    `).all(id);

    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener pagos del cliente', detalle: error.message });
  }
};

// ── POST /pagos - CREA UN PAGO MANUAL ──
const crearPago = (req, res) => {
  try {
    const { cliente_id, servicio_id, periodo, monto } = req.body;

    // 1 - VALIDO LOS CAMPOS REQUERIDOS:
    if (!cliente_id || !servicio_id || !periodo || !monto) {
      return res.status(400).json({ error: 'cliente_id, servicio_id, periodo y monto son requeridos' });
    }

    // 2 - TRAIGO EL TIPO DEL SERVICIO:
    const servicio = db.prepare(`SELECT tipo_facturacion FROM servicios WHERE id = ?`).get(servicio_id);
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

    // 3 - INSERTO EL PAGO EN LA DB:
    const resultado = db.prepare(`
      INSERT INTO pagos (cliente_id, servicio_id, periodo, tipo, monto, estado)
      VALUES (?, ?, ?, ?, ?, 'pendiente')
    `).run(cliente_id, servicio_id, periodo, servicio.tipo_facturacion, monto);

    // 4 - DEVUELVO EL PAGO CREADO:
    const nuevoPago = db.prepare(`SELECT * FROM pagos WHERE id = ?`).get(resultado.lastInsertRowid);
    res.status(201).json(nuevoPago);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear pago', detalle: error.message });
  }
};

// ── PUT /pagos/:id - MARCA UN PAGO COMO PAGADO O EDITA SU ESTADO ──
const actualizarPago = (req, res) => {
  try {
    const { id }    = req.params;
    const { estado, fecha_pago } = req.body;

    // 1 - VERIFICO QUE EL PAGO EXISTE:
    const pagoExistente = db.prepare(`SELECT id FROM pagos WHERE id = ?`).get(id);
    if (!pagoExistente) return res.status(404).json({ error: 'Pago no encontrado' });

    // 2 - VALIDO EL ESTADO:
    if (estado && !['pendiente', 'pagado'].includes(estado)) {
      return res.status(400).json({ error: 'estado debe ser "pendiente" o "pagado"' });
    }

    // 3 - ACTUALIZO EL PAGO:
    const fechaPagoFinal = estado === 'pagado'
      ? (fecha_pago || new Date().toISOString().split('T')[0])
      : null;

    db.prepare(`
      UPDATE pagos
      SET estado     = COALESCE(?, estado),
          fecha_pago = ?
      WHERE id = ?
    `).run(estado || null, fechaPagoFinal, id);

    // 4 - DEVUELVO EL PAGO ACTUALIZADO:
    const pagoActualizado = db.prepare(`SELECT * FROM pagos WHERE id = ?`).get(id);
    res.json(pagoActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar pago', detalle: error.message });
  }
};

// ── POST /pagos/generar - GENERA PAGOS PENDIENTES PARA EL PERIODO ACTUAL ──
const generarPagos = (req, res) => {
  try {
    // 1 - LLAMO AL SERVICIO QUE GENERA LOS PAGOS:
    const pagosCreados = pagosService.generarTodosPagosPendientes();

    res.json({
      mensaje: `Se generaron ${pagosCreados} nuevos pagos pendientes`,
      pagosCreados
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar pagos', detalle: error.message });
  }
};

// ── GET /pagos/stats - ESTADÍSTICAS GENERALES DE PAGOS ──
const obtenerEstadisticas = (req, res) => {
  try {
    // 1 - CUENTO CLIENTES ACTIVOS:
    const totalClientes = db.prepare(`SELECT COUNT(*) AS total FROM clientes`).get().total;

    // 2 - CUENTO SERVICIOS ACTIVOS:
    const totalServicios = db.prepare(`SELECT COUNT(*) AS total FROM servicios`).get().total;

    // 3 - SUMO MONTOS PENDIENTES:
    const pendientes = db.prepare(`
      SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total
      FROM pagos WHERE estado = 'pendiente'
    `).get();

    // 4 - SUMO MONTOS PAGADOS:
    const pagados = db.prepare(`
      SELECT COUNT(*) AS cantidad, COALESCE(SUM(monto), 0) AS total
      FROM pagos WHERE estado = 'pagado'
    `).get();

    res.json({
      totalClientes,
      totalServicios,
      pendientes: { cantidad: pendientes.cantidad, total: pendientes.total },
      pagados:    { cantidad: pagados.cantidad,    total: pagados.total    }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas', detalle: error.message });
  }
};

// ── POST /pagos/:id/upload - SUBE UN COMPROBANTE ──
const subirComprobante = (req, res) => {
  try {
    const { id } = req.params;
    const file   = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // 1 - VERIFICO QUE EL PAGO EXISTA:
    const pago = db.prepare(`SELECT id FROM pagos WHERE id = ?`).get(id);
    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });

    // 2 - ACTUALIZO LA RUTA DEL COMPROBANTE EN LA DB:
    // Guardamos la ruta relativa para que sea accesible vía /uploads
    const rutaArchivo = `/uploads/${file.filename}`;

    db.prepare(`
      UPDATE pagos 
      SET comprobante = ? 
      WHERE id = ?
    `).run(rutaArchivo, id);

    res.json({
      mensaje: 'Comprobante subido con éxito',
      ruta: rutaArchivo
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al subir comprobante', detalle: error.message });
  }
};

// 5 - EXPORTO TODOS LOS CONTROLADORES:
module.exports = {
  listarPagos,
  listarPagosDeCliente,
  crearPago,
  actualizarPago,
  generarPagos,
  obtenerEstadisticas,
  subirComprobante
};
