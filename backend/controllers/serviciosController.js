// ============================================================
// CONTROLADOR DE SERVICIOS
// ============================================================

// 1 - IMPORTO LA CONEXIÓN A LA DB:
const db = require('../database/db');

// ── GET /servicios - LISTA TODOS LOS SERVICIOS ──
const listarServicios = (req, res) => {
  try {
    // 1 - HAGO LA QUERY PARA TRAER TODOS LOS SERVICIOS:
    const servicios = db.prepare(`
      SELECT * FROM servicios ORDER BY created_at DESC
    `).all();

    res.json(servicios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios', detalle: error.message });
  }
};

// ── GET /servicios/:id - OBTIENE UN SERVICIO POR ID ──
const obtenerServicio = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - BUSCO EL SERVICIO POR ID:
    const servicio = db.prepare(`SELECT * FROM servicios WHERE id = ?`).get(id);

    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });

    res.json(servicio);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicio', detalle: error.message });
  }
};

// ── POST /servicios - CREA UN NUEVO SERVICIO ──
const crearServicio = (req, res) => {
  try {
    const { nombre, descripcion, precio, tipo_facturacion } = req.body;

    // 1 - VALIDO LOS CAMPOS REQUERIDOS:
    if (!nombre || !precio || !tipo_facturacion) {
      return res.status(400).json({ error: 'nombre, precio y tipo_facturacion son requeridos' });
    }
    if (!['mensual', 'anual'].includes(tipo_facturacion)) {
      return res.status(400).json({ error: 'tipo_facturacion debe ser "mensual" o "anual"' });
    }

    // 2 - INSERTO EL NUEVO SERVICIO EN LA DB:
    const resultado = db.prepare(`
      INSERT INTO servicios (nombre, descripcion, precio, tipo_facturacion)
      VALUES (?, ?, ?, ?)
    `).run(nombre, descripcion || null, precio, tipo_facturacion);

    // 3 - DEVUELVO EL SERVICIO RECIÉN CREADO:
    const nuevoServicio = db.prepare(`SELECT * FROM servicios WHERE id = ?`).get(resultado.lastInsertRowid);
    res.status(201).json(nuevoServicio);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear servicio', detalle: error.message });
  }
};

// ── PUT /servicios/:id - ACTUALIZA UN SERVICIO ──
const actualizarServicio = (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, tipo_facturacion } = req.body;

    // 1 - VERIFICO QUE EL SERVICIO EXISTE:
    const servicioExistente = db.prepare(`SELECT id FROM servicios WHERE id = ?`).get(id);
    if (!servicioExistente) return res.status(404).json({ error: 'Servicio no encontrado' });

    // 2 - VALIDO tipo_facturacion SI SE ENVÍA:
    if (tipo_facturacion && !['mensual', 'anual'].includes(tipo_facturacion)) {
      return res.status(400).json({ error: 'tipo_facturacion debe ser "mensual" o "anual"' });
    }

    // 3 - ACTUALIZO EL SERVICIO EN LA DB:
    db.prepare(`
      UPDATE servicios
      SET nombre = COALESCE(?, nombre),
          descripcion = COALESCE(?, descripcion),
          precio = COALESCE(?, precio),
          tipo_facturacion = COALESCE(?, tipo_facturacion)
      WHERE id = ?
    `).run(nombre || null, descripcion || null, precio || null, tipo_facturacion || null, id);

    // 4 - DEVUELVO EL SERVICIO ACTUALIZADO:
    const servicioActualizado = db.prepare(`SELECT * FROM servicios WHERE id = ?`).get(id);
    res.json(servicioActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar servicio', detalle: error.message });
  }
};

// ── DELETE /servicios/:id - ELIMINA UN SERVICIO ──
const eliminarServicio = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - VERIFICO QUE EL SERVICIO EXISTE:
    const servicioExistente = db.prepare(`SELECT id FROM servicios WHERE id = ?`).get(id);
    if (!servicioExistente) return res.status(404).json({ error: 'Servicio no encontrado' });

    // 2 - ELIMINO EL SERVICIO (CASCADE borra asignaciones y pagos relacionados):
    db.prepare(`DELETE FROM servicios WHERE id = ?`).run(id);

    res.json({ mensaje: 'Servicio eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar servicio', detalle: error.message });
  }
};

// 4 - EXPORTO TODOS LOS CONTROLADORES:
module.exports = { listarServicios, obtenerServicio, crearServicio, actualizarServicio, eliminarServicio };


