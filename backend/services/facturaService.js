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

// ── FUNCIÓN 3: SINCRONIZO (CREO O ACTUALIZO) LA FACTURA DEL PERÍODO PARA UN CLIENTE ──
// Se llama cuando se asigna o quita un servicio a un cliente.
function sincronizarFacturaCliente(clienteId) {

  // 1 - OBTENGO TODOS LOS SERVICIOS ACTIVOS DEL CLIENTE CON SU TIPO:
  const servicios = db.prepare(`
    SELECT s.id, s.nombre, s.precio, s.tipo_facturacion
    FROM cliente_servicios cs
    JOIN servicios s ON cs.servicio_id = s.id
    WHERE cs.cliente_id = ?
  `).all(clienteId);

  // 2 - AGRUPO LOS SERVICIOS POR PERÍODO (mensual → "2026-04", anual → "2026"):
  const porPeriodo = {};
  for (const s of servicios) {
    const periodo = getPeriodoActual(s.tipo_facturacion);
    if (!porPeriodo[periodo]) porPeriodo[periodo] = [];
    porPeriodo[periodo].push(s);
  }

  // 3 - PROCESO CADA GRUPO DE PERÍODO:
  for (const [periodo, serviciosPeriodo] of Object.entries(porPeriodo)) {

    // 3a - BUSCO SI YA EXISTE FACTURA PARA ESTE CLIENTE + PERÍODO:
    const facturaExiste = db.prepare(`
      SELECT id, estado FROM facturas WHERE cliente_adm_id = ? AND periodo = ?
    `).get(clienteId, periodo);

    // 3b - CALCULO EL TOTAL DEL PERÍODO:
    const total = serviciosPeriodo.reduce((sum, s) => sum + s.precio, 0);

    // 3c - EJECUTO EN UNA TRANSACCIÓN:
    const syncUno = db.transaction(() => {

      if (!facturaExiste) {
        // 3c.1 - CREO LA FACTURA NUEVA:
        const result = db.prepare(`
          INSERT INTO facturas (client_id, cliente_adm_id, periodo, total) VALUES (NULL, ?, ?, ?)
        `).run(clienteId, periodo, total);

        // 3c.2 - INSERTO CADA SERVICIO COMO ÍTEM DE DETALLE:
        const ins = db.prepare(`
          INSERT INTO detalle_factura (factura_id, descripcion, cantidad, importe) VALUES (?, ?, 1, ?)
        `);
        for (const s of serviciosPeriodo) {
          ins.run(result.lastInsertRowid, s.nombre, s.precio);
        }

      } else {
        // 3c.3 - ACTUALIZO LA FACTURA EXISTENTE (solo si está pendiente):
        if (facturaExiste.estado === 'pendiente') {
          db.prepare(`DELETE FROM detalle_factura WHERE factura_id = ?`).run(facturaExiste.id);
          db.prepare(`UPDATE facturas SET total = ? WHERE id = ?`).run(total, facturaExiste.id);

          const ins = db.prepare(`
            INSERT INTO detalle_factura (factura_id, descripcion, cantidad, importe) VALUES (?, ?, 1, ?)
          `);
          for (const s of serviciosPeriodo) {
            ins.run(facturaExiste.id, s.nombre, s.precio);
          }
        }
      }
    });

    syncUno();
  }
}

// ── FUNCIÓN 4: MIGRACIÓN - CONVIERTO PAGOS EXISTENTES EN FACTURAS ──
// Se llama una sola vez al arrancar el servidor para no perder datos del sistema viejo.
function migrarPagosAFacturas() {

  // 1 - OBTENGO GRUPOS ÚNICOS DE (cliente_id, periodo) DE LA TABLA PAGOS:
  const grupos = db.prepare(`
    SELECT
      cliente_id,
      periodo,
      COUNT(*)                                             AS total_servicios,
      SUM(monto)                                           AS total_monto,
      MIN(CASE WHEN estado = 'pendiente' THEN 0 ELSE 1 END) AS todos_pagados
    FROM pagos
    GROUP BY cliente_id, periodo
  `).all();

  let migradas = 0;

  // 2 - PROCESO CADA GRUPO:
  for (const grupo of grupos) {

    // 2a - VERIFICO SI YA EXISTE FACTURA PARA ESTE CLIENTE + PERÍODO:
    const existe = db.prepare(`
      SELECT id FROM facturas WHERE cliente_adm_id = ? AND periodo = ?
    `).get(grupo.cliente_id, grupo.periodo);

    if (existe) continue;

    // 2b - TRAIGO LOS PAGOS DEL GRUPO CON NOMBRE DE SERVICIO:
    const pagosGrupo = db.prepare(`
      SELECT p.monto, p.estado, s.nombre AS servicio_nombre
      FROM pagos p
      JOIN servicios s ON p.servicio_id = s.id
      WHERE p.cliente_id = ? AND p.periodo = ?
    `).all(grupo.cliente_id, grupo.periodo);

    if (pagosGrupo.length === 0) continue;

    // 2c - ESTADO DE LA FACTURA: pagado solo si TODOS los pagos están pagados:
    const estadoFactura = pagosGrupo.every(p => p.estado === 'pagado') ? 'pagado' : 'pendiente';

    // 2d - CREO LA FACTURA CON EL ESTADO CORRECTO:
    const migrar = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO facturas (client_id, cliente_adm_id, periodo, total, estado)
        VALUES (NULL, ?, ?, ?, ?)
      `).run(grupo.cliente_id, grupo.periodo, grupo.total_monto, estadoFactura);

      // 2e - INSERTO CADA PAGO COMO ÍTEM DE DETALLE:
      const ins = db.prepare(`
        INSERT INTO detalle_factura (factura_id, descripcion, cantidad, importe) VALUES (?, ?, 1, ?)
      `);
      for (const p of pagosGrupo) {
        ins.run(result.lastInsertRowid, p.servicio_nombre, p.monto);
      }
    });

    migrar();
    migradas++;
  }

  return migradas;
}

// 4 - EXPORTO LAS FUNCIONES:
module.exports = {
  generarPagoParaAsignacion,
  generarTodosPagosPendientes,
  getPeriodoActual,
  sincronizarFacturaCliente,
  migrarPagosAFacturas
};
