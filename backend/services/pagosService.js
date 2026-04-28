// ============================================================
// SERVICIO DE PAGOS - LÓGICA DE GENERACIÓN AUTOMÁTICA
// ============================================================

// 1 - IMPORTO LA CONEXIÓN A LA DB:
const db = require('../database/db');

// ── HELPER: OBTENGO EL PERIODO ACTUAL SEGÚN TIPO DE FACTURACIÓN ──
// Mensual → "2026-04"  |  Anual → "2026"
function getPeriodoActual(tipo) {
  const hoy = new Date();
  if (tipo === 'mensual') {
    const anio = hoy.getFullYear();
    const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${anio}-${mes}`;
  }
  return String(hoy.getFullYear());
}

// ── FUNCIÓN 1: GENERO UN PAGO PARA UNA ASIGNACIÓN ESPECÍFICA ──
// Se llama cuando un servicio es asignado a un cliente.
function generarPagoParaAsignacion(clienteId, servicioId) {

  // 1 - OBTENGO LA INFO DEL SERVICIO:
  const servicio = db.prepare(`
    SELECT precio, tipo_facturacion FROM servicios WHERE id = ?
  `).get(servicioId);

  if (!servicio) return null;

  // 2 - CALCULO EL PERIODO ACTUAL:
  const periodo = getPeriodoActual(servicio.tipo_facturacion);

  // 3 - VERIFICO QUE NO EXISTA YA UN PAGO PARA ESTE PERIODO:
  const pagoExistente = db.prepare(`
    SELECT id FROM pagos
    WHERE cliente_id = ? AND servicio_id = ? AND periodo = ?
  `).get(clienteId, servicioId, periodo);

  if (pagoExistente) return pagoExistente;

  // 4 - CREO EL PAGO PENDIENTE:
  const resultado = db.prepare(`
    INSERT INTO pagos (cliente_id, servicio_id, periodo, tipo, monto, estado)
    VALUES (?, ?, ?, ?, ?, 'pendiente')
  `).run(clienteId, servicioId, periodo, servicio.tipo_facturacion, servicio.precio);

  return { id: resultado.lastInsertRowid };
}

// ── FUNCIÓN 2: GENERO PAGOS PARA TODAS LAS ASIGNACIONES ACTIVAS ──
// Se llama manualmente desde el endpoint POST /pagos/generar
function generarTodosPagosPendientes() {

  // 1 - OBTENGO TODAS LAS ASIGNACIONES CON INFO DEL SERVICIO:
  const asignaciones = db.prepare(`
    SELECT cs.cliente_id, cs.servicio_id, s.precio, s.tipo_facturacion
    FROM cliente_servicios cs
    JOIN servicios s ON cs.servicio_id = s.id
  `).all();

  // 2 - CUENTO CUÁNTOS PAGOS SE CREAN EN ESTA EJECUCIÓN:
  let pagosCreados = 0;

  // 3 - PROCESO CADA ASIGNACIÓN:
  for (const asignacion of asignaciones) {

    // 3a - CALCULO EL PERIODO CORRESPONDIENTE:
    const periodo = getPeriodoActual(asignacion.tipo_facturacion);

    // 3b - VERIFICO SI YA EXISTE EL PAGO PARA ESTE PERIODO:
    const pagoExistente = db.prepare(`
      SELECT id FROM pagos
      WHERE cliente_id = ? AND servicio_id = ? AND periodo = ?
    `).get(asignacion.cliente_id, asignacion.servicio_id, periodo);

    // 3c - SI NO EXISTE, LO CREO:
    if (!pagoExistente) {
      db.prepare(`
        INSERT INTO pagos (cliente_id, servicio_id, periodo, tipo, monto, estado)
        VALUES (?, ?, ?, ?, ?, 'pendiente')
      `).run(
        asignacion.cliente_id,
        asignacion.servicio_id,
        periodo,
        asignacion.tipo_facturacion,
        asignacion.precio
      );
      pagosCreados++;
    }
  }

  return pagosCreados;
}

// 4 - EXPORTO LAS FUNCIONES:
module.exports = { generarPagoParaAsignacion, generarTodosPagosPendientes, getPeriodoActual };

