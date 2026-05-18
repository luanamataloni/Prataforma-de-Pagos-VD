// ============================================================
// CONTROLADOR: CONFIGURACIÓN DEL PROVEEDOR (PERFIL ADMIN)
// ============================================================

const db = require('../database/db');

// ── GET /configuracion - TRAIGO TODOS LOS DATOS DEL PROVEEDOR ──
const getConfiguracion = (req, res) => {
  try {

    // 1 - TRAIGO TODAS LAS CLAVES DE LA TABLA:
    const filas = db.prepare(`SELECT clave, valor FROM configuracion`).all();

    // 2 - CONVIERTO EL ARRAY [{clave, valor}] A UN OBJETO PLANO:
    const config = {};
    filas.forEach(({ clave, valor }) => { config[clave] = valor || ''; });

    // 3 - RESPONDO CON EL OBJETO DE CONFIGURACIÓN:
    res.json(config);

  } catch (err) {
    res.status(500).json({ error: 'Error al obtener configuración', detalle: err.message });
  }
};

// ── PUT /configuracion - ACTUALIZO LOS DATOS DEL PROVEEDOR ──
const updateConfiguracion = (req, res) => {
  try {

    const { razon_social, rubro, cuit, direccion, telefono, mail_envio } = req.body;

    // 1 - PREPARO LA QUERY DE UPSERT:
    const upsert = db.prepare(`
      INSERT INTO configuracion (clave, valor)
      VALUES (?, ?)
      ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor
    `);

    // 2 - ACTUALIZO CADA CAMPO UNO POR UNO (incluido mail_envio):
    const campos = { razon_social, rubro, cuit, direccion, telefono, mail_envio };
    Object.entries(campos).forEach(([clave, valor]) => {
      if (valor !== undefined) upsert.run(clave, valor);
    });

    // 3 - TRAIGO LA CONFIGURACIÓN ACTUALIZADA Y LA DEVUELVO:
    const filas = db.prepare(`SELECT clave, valor FROM configuracion`).all();
    const config = {};
    filas.forEach(({ clave, valor }) => { config[clave] = valor || ''; });

    res.json({ mensaje: 'Configuración actualizada correctamente', config });

  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar configuración', detalle: err.message });
  }
};

module.exports = { getConfiguracion, updateConfiguracion };

