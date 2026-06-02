// ============================================================
// CONTROLADOR: FACTURAS DEL PORTAL
// ============================================================

// 1 - IMPORTO LA CONEXIÓN A LA DB:
const db = require('../database/db');

// 1b - IMPORTO EL SERVICIO DE ENVÍO DE MAILS Y DE GENERACIÓN DE PDF:
const { enviarMailNuevaFactura, enviarMailFacturaManual, crearPdfFacturaBuffer } = require('../services/emailService');

// 1c - IMPORTO EL GENERADOR DE HTML COMPARTIDO (mismo que usa el PDF del mail):
const { generarHTMLFacturaString } = require('../services/facturaHtmlService');

// ── HELPER: OBTIENE EL PERIODO ACTUAL (YYYY-MM) ──
function getPeriodoActual() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
}

// ── HELPER: AGREGA DETALLE A UNA FACTURA ──
function getDetalleFactura(facturaId) {
  return db.prepare(`SELECT * FROM detalle_factura WHERE factura_id = ? ORDER BY id ASC`).all(facturaId);
}

// ── HELPER: FORMATEA MONTO EN PESOS ──
function fmt(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);
}

// ── HELPER: FORMATEA PERIODO A NOMBRE LEGIBLE ──
function fmtPeriodo(p) {
  if (!p) return '';
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const [anio, mes] = p.split('-');
  return mes ? `${meses[parseInt(mes)]} ${anio}` : anio;
}

// ── GET /facturas-portal - LISTA FACTURAS (admin: todas | client: las suyas) ──
const listarFacturas = (req, res) => {
  try {
    let facturas;

    if (req.user.role === 'admin') {
      // 1a - ADMIN VE SOLO LAS FACTURAS GENERADAS PARA CLIENTES ADMIN (cliente_adm_id):
      // Esto evita duplicados de clientes que existían en ambas tablas.
      facturas = db.prepare(`
        SELECT
          f.*,
          cl.razon_social  AS razon_social,
          cl.cuit          AS cliente_cuit,
          cl.email         AS cliente_email,
          cl.foto_perfil   AS cliente_foto
        FROM facturas f
        JOIN clientes cl ON cl.id = f.cliente_adm_id
        ORDER BY f.created_at DESC
      `).all();

    } else {
      // 1b - BUSCO EL REGISTRO EN clientes USANDO EL user_id DEL USUARIO LOGUEADO:
      // (El admin vincula clientes con acceso al portal via clientes.user_id)
      const clienteAdm = db.prepare(`SELECT id, razon_social FROM clientes WHERE user_id = ?`).get(req.user.id);
      if (!clienteAdm) return res.status(404).json({ error: 'No tenés un perfil de cliente asociado a este usuario' });

      // 1c - TRAIGO TODAS SUS FACTURAS ORDENADAS POR PERIODO (más reciente primero):
      facturas = db.prepare(`
        SELECT
          f.*,
          cl.razon_social AS razon_social,
          cl.foto_perfil  AS cliente_foto
        FROM facturas f
        JOIN clientes cl ON cl.id = f.cliente_adm_id
        WHERE f.cliente_adm_id = ?
        ORDER BY f.periodo DESC, f.created_at DESC
      `).all(clienteAdm.id);
    }

    // 2 - AGREGO EL DETALLE A CADA FACTURA:
    facturas = facturas.map(f => ({
      ...f,
      nombre_display: f.razon_social || 'Sin nombre',
      detalle: getDetalleFactura(f.id)
    }));

    res.json(facturas);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener facturas', detalle: error.message });
  }
};

// ── GET /facturas-portal/periodo-actual - FACTURA DEL PERIODO EN CURSO ──
const getFacturaPeriodoActual = (req, res) => {
  try {
    // 1 - BUSCO EL CLIENTE EN LA TABLA clientes POR SU user_id:
    const clienteAdm = db.prepare(`SELECT id FROM clientes WHERE user_id = ?`).get(req.user.id);
    if (!clienteAdm) return res.status(404).json({ error: 'No tenés un perfil de cliente asociado a este usuario' });

    // 2 - BUSCO LA FACTURA DEL PERIODO ACTUAL USANDO cliente_adm_id:
    const periodo = getPeriodoActual();
    const factura = db.prepare(`
      SELECT f.*, cl.razon_social AS client_nombre
      FROM facturas f
      JOIN clientes cl ON cl.id = f.cliente_adm_id
      WHERE f.cliente_adm_id = ? AND f.periodo = ?
    `).get(clienteAdm.id, periodo);

    if (!factura) {
      return res.json({ factura: null, periodo, mensaje: 'No hay factura para el período actual' });
    }

    // 3 - TRAIGO EL DETALLE DE LA FACTURA:
    const detalle = getDetalleFactura(factura.id);
    res.json({ factura: { ...factura, detalle }, periodo });

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener factura del período', detalle: error.message });
  }
};

// ── GET /facturas-portal/:id - OBTIENE UNA FACTURA POR ID CON DETALLE ──
const getFacturaById = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - BUSCO LA FACTURA CON INFO DEL CLIENTE:
    const factura = db.prepare(`
      SELECT
        f.*,
        c.nombre         AS client_nombre,
        cl.razon_social  AS razon_social,
        cl.cuit          AS cliente_cuit,
        cl.email         AS cliente_email,
        cl.direccion     AS cliente_direccion,
        cl.foto_perfil   AS cliente_foto
      FROM facturas f
      LEFT JOIN clients  c  ON c.id  = f.client_id
      LEFT JOIN clientes cl ON cl.id = f.cliente_adm_id
      WHERE f.id = ?
    `).get(id);

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    // 2 - TRAIGO EL DETALLE:
    const detalle = getDetalleFactura(id);

    res.json({
      ...factura,
      nombre_display: factura.razon_social || factura.client_nombre || 'Sin nombre',
      detalle
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener factura', detalle: error.message });
  }
};

// ── POST /facturas-portal - CREA UNA FACTURA CON SU DETALLE (admin only) ──
const crearFactura = (req, res) => {
  try {
    const { client_id, cliente_adm_id, periodo, detalle } = req.body;

    // 1 - VALIDO QUE EXISTA AL MENOS UN IDENTIFICADOR DE CLIENTE:
    if ((!client_id && !cliente_adm_id) || !periodo) {
      return res.status(400).json({ error: 'client_id (o cliente_adm_id) y periodo son requeridos' });
    }

    // 2 - VERIFICO QUE EL CLIENT / CLIENTE EXISTE:
    if (client_id) {
      const client = db.prepare(`SELECT id FROM clients WHERE id = ?`).get(client_id);
      if (!client) return res.status(404).json({ error: 'Cliente portal no encontrado' });
    }
    if (cliente_adm_id) {
      const clienteAdm = db.prepare(`SELECT id FROM clientes WHERE id = ?`).get(cliente_adm_id);
      if (!clienteAdm) return res.status(404).json({ error: 'Cliente admin no encontrado' });
    }

    // 3 - VERIFICO QUE NO EXISTA FACTURA PARA ESTE PERIODO:
    const facturaExiste = db.prepare(`
      SELECT id FROM facturas
      WHERE (client_id = ? OR cliente_adm_id = ?) AND periodo = ?
    `).get(client_id || null, cliente_adm_id || null, periodo);
    if (facturaExiste) return res.status(409).json({ error: 'Ya existe una factura para este cliente en este período' });

    // 4 - CALCULO EL TOTAL SUMANDO TODOS LOS ÍTEMS:
    const total = (detalle || []).reduce((sum, item) => sum + (Number(item.cantidad) * Number(item.importe)), 0);

    // 5 - CREO LA FACTURA:
    const facturaResult = db.prepare(`
      INSERT INTO facturas (client_id, cliente_adm_id, periodo, total) VALUES (?, ?, ?, ?)
    `).run(client_id || null, cliente_adm_id || null, periodo, total);

    // 6 - INSERTO EL DETALLE ÍTEM POR ÍTEM:
    if (detalle && detalle.length > 0) {
      const insertItem = db.prepare(`
        INSERT INTO detalle_factura (factura_id, descripcion, cantidad, importe) VALUES (?, ?, ?, ?)
      `);
      for (const item of detalle) {
        insertItem.run(facturaResult.lastInsertRowid, item.descripcion, item.cantidad, item.importe);
      }
    }

    // 7 - DEVUELVO LA FACTURA CON SU DETALLE:
    const nuevaFactura = db.prepare(`SELECT * FROM facturas WHERE id = ?`).get(facturaResult.lastInsertRowid);
    res.status(201).json({ ...nuevaFactura, detalle: getDetalleFactura(facturaResult.lastInsertRowid) });

  } catch (error) {
    res.status(500).json({ error: 'Error al crear factura', detalle: error.message });
  }
};

// ── PUT /facturas-portal/:id/pagar - MARCA LA FACTURA COMO PAGADA ──
const marcarPagado = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - VERIFICO QUE LA FACTURA EXISTE:
    let factura = db.prepare(`SELECT * FROM facturas WHERE id = ?`).get(id);
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    // 2 - SI ES CLIENTE, VERIFICO QUE SEA SU PROPIA FACTURA (seguridad via FK):
    if (req.user.role === 'client') {
      const client = db.prepare(`SELECT id FROM clients WHERE user_id = ?`).get(req.user.id);
      if (!client || factura.client_id !== client.id) {
        return res.status(403).json({ error: 'No tenés acceso a esta factura' });
      }
    }

    // 3 - ACTUALIZO EL ESTADO A pagado:
    db.prepare(`UPDATE facturas SET estado = 'pagado' WHERE id = ?`).run(id);

    // 4 - SI ES EL ADMIN QUIEN CONFIRMA, NOTIFICO AL CLIENTE:
    if (req.user.role === 'admin') {

      // 4a - BUSCO EL CLIENTE DUEÑO DE ESTA FACTURA Y SU user_id:
      const facturaConCliente = db.prepare(`
        SELECT f.periodo, cl.razon_social, cl.user_id
        FROM   facturas f
        LEFT JOIN clientes cl ON cl.id = f.cliente_adm_id
        WHERE  f.id = ?
      `).get(id);

      // 4b - SOLO NOTIFICO SI EL CLIENTE TIENE USUARIO EN EL SISTEMA:
      if (facturaConCliente && facturaConCliente.user_id) {
        const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const [anio, mes]  = (facturaConCliente.periodo || '').split('-');
        const periodoLabel = mes ? `${meses[parseInt(mes)]} ${anio}` : anio;
        const nroFactura   = String(id).padStart(4, '0');

        const mensajeNotif = `✅ Tu pago de la factura #${nroFactura} del período ${periodoLabel} fue confirmado por el administrador`;

        // 4c - INSERTO LA NOTIFICACIÓN PARA EL CLIENTE:
        db.prepare(`
          INSERT INTO notificaciones (tipo, factura_id, para_user_id, mensaje)
          VALUES ('pago_confirmado', ?, ?, ?)
        `).run(id, facturaConCliente.user_id, mensajeNotif);
      }
    }

    factura = db.prepare(`SELECT * FROM facturas WHERE id = ?`).get(id);
    res.json(factura);

  } catch (error) {
    res.status(500).json({ error: 'Error al marcar factura como pagada', detalle: error.message });
  }
};

// ── POST /facturas-portal/generar-periodo - GENERA FACTURAS PARA TODO EL PERÍODO ──
const generarFacturasPeriodo = async (req, res) => {
  try {
    const { periodo } = req.body;

    // 1 - VALIDO EL CAMPO PERIODO:
    if (!periodo) return res.status(400).json({ error: 'periodo es requerido (formato: YYYY-MM)' });

    // 2 - OBTENGO TODOS LOS CLIENTES ADMIN (traigo email y cuit para el mail):
    const clientes = db.prepare(`SELECT id, razon_social, cuit, email, direccion FROM clientes`).all();

    // 2b - TRAIGO LA CONFIGURACIÓN DEL ADMINISTRADOR (para el mail):
    const configFilas = db.prepare(`SELECT clave, valor FROM configuracion`).all();
    const config = {};
    configFilas.forEach(({ clave, valor }) => { config[clave] = valor || ''; });

    let creadas      = 0;
    let omitidas     = 0;
    let sinServicios = 0;
    // Lista de facturas nuevas para enviar emails después:
    const facturasNuevas = [];

    // 3 - FUNCIÓN TRANSACCIONAL PARA CREAR UNA FACTURA:
    const crearUnaFactura = db.transaction((cliente, servicios) => {

      // 3a - VERIFICO QUE NO EXISTA FACTURA PARA ESTE CLIENTE Y PERIODO:
      const existe = db.prepare(`
        SELECT id FROM facturas WHERE cliente_adm_id = ? AND periodo = ?
      `).get(cliente.id, periodo);

      if (existe) return null;

      // 3b - CALCULO EL TOTAL SUMANDO LOS PRECIOS DE TODOS LOS SERVICIOS:
      const total = servicios.reduce((sum, s) => sum + s.precio, 0);

      // 3c - CREO LA FACTURA (sin client_id de portal, usando cliente_adm_id):
      const facturaResult = db.prepare(`
        INSERT INTO facturas (client_id, cliente_adm_id, periodo, total) VALUES (NULL, ?, ?, ?)
      `).run(cliente.id, periodo, total);

      const facturaId = facturaResult.lastInsertRowid;

      // 3d - INSERTO CADA SERVICIO COMO ÍTEM DEL DETALLE:
      const insertItem = db.prepare(`
        INSERT INTO detalle_factura (factura_id, descripcion, cantidad, importe) VALUES (?, ?, 1, ?)
      `);
      for (const s of servicios) {
        insertItem.run(facturaId, s.nombre, s.precio);
      }

      // 3e - DEVUELVO LA FACTURA CREADA CON SU DETALLE (para el mail):
      return {
        id:      facturaId,
        periodo: periodo,
        total:   total,
        detalle: servicios.map(s => ({ descripcion: s.nombre, cantidad: 1, importe: s.precio }))
      };
    });

    // 4 - PROCESO CADA CLIENTE:
    for (const cliente of clientes) {

      // 4a - OBTENGO LOS SERVICIOS DE ESTE CLIENTE:
      const servicios = db.prepare(`
        SELECT s.id, s.nombre, s.precio
        FROM cliente_servicios cs
        JOIN servicios s ON cs.servicio_id = s.id
        WHERE cs.cliente_id = ?
      `).all(cliente.id);

      // 4b - SI NO TIENE SERVICIOS, LO SALTO:
      if (servicios.length === 0) { sinServicios++; continue; }

      // 4c - CREO LA FACTURA DE FORMA TRANSACCIONAL:
      const facturaCreada = crearUnaFactura(cliente, servicios);

      if (!facturaCreada) {
        // 4d - YA EXISTÍA, LA OMITO:
        omitidas++;
      } else {
        // 4e - NUEVA → LA GUARDO PARA ENVIAR EL MAIL DESPUÉS:
        creadas++;
        facturasNuevas.push({ cliente, factura: facturaCreada });
      }
    }

    // 5 - RESPONDO INMEDIATAMENTE AL FRONTEND (no espero los mails):
    res.json({
      mensaje:     `Se generaron ${creadas} facturas para el período ${fmtPeriodo(periodo)}.`,
      creadas,
      omitidas,
      sinServicios,
      periodo
    });

    // 6 - ENVÍO LOS MAILS EN SEGUNDO PLANO (no bloquea la respuesta):
    // Cada cliente que tiene email registrado recibirá su factura por correo.
    for (const { cliente, factura } of facturasNuevas) {
      await enviarMailNuevaFactura({
        cliente,
        factura,
        detalle: factura.detalle,
        config
      });
    }

  } catch (error) {
    res.status(500).json({ error: 'Error al generar facturas del período', detalle: error.message });
  }
};

// ── GET /facturas-portal/:id/html - GENERA EL HTML DE LA FACTURA PARA IMPRIMIR / PDF ──
const generarHTMLFactura = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - OBTENGO LA FACTURA CON DATOS DE AMBOS TIPOS DE CLIENTE:
    const factura = db.prepare(`
      SELECT
        f.*,
        c.nombre        AS client_nombre,
        cl.razon_social AS razon_social,
        cl.cuit         AS cliente_cuit,
        cl.email        AS cliente_email,
        cl.direccion    AS cliente_direccion,
        cl.telefono     AS cliente_telefono
      FROM facturas f
      LEFT JOIN clients  c  ON c.id  = f.client_id
      LEFT JOIN clientes cl ON cl.id = f.cliente_adm_id
      WHERE f.id = ?
    `).get(id);

    if (!factura) return res.status(404).send('<h1>Factura no encontrada</h1>');

    // 2 - OBTENGO EL DETALLE DE ÍTEMS:
    const detalle = getDetalleFactura(id);

    // 3 - TRAIGO LOS DATOS DEL PERFIL DEL ADMINISTRADOR (proveedor):
    const configFilas = db.prepare(`SELECT clave, valor FROM configuracion`).all();
    const config = {};
    configFilas.forEach(({ clave, valor }) => { config[clave] = valor || ''; });

    // 4 - GENERO EL HTML USANDO EL SERVICIO COMPARTIDO (mismo que usa el PDF del mail):
    // El botón imprimir se agrega acá porque en el PDF del mail no se muestra.
    const htmlFactura = generarHTMLFacturaString({ factura, detalle, config });

    // 5 - AGREGO EL BOTÓN IMPRIMIR AL HTML PARA EL NAVEGADOR:
    const htmlConBoton = htmlFactura.replace(
      '<div class="factura-wrapper">',
      `<!-- BOTÓN IMPRIMIR / GUARDAR PDF -->
  <div class="print-btn" style="display:flex; justify-content:center; margin:24px auto 0; max-width:760px;">
    <button onclick="window.print()"
            style="background:#7C3AED; color:#fff; border:none; border-radius:9999px;
                   padding:12px 32px; font-family:'Inter',sans-serif; font-size:0.95rem;
                   font-weight:600; cursor:pointer; display:flex; align-items:center; gap:8px;">
      🖨️ Imprimir / Guardar PDF
    </button>
  </div>

  <div class="factura-wrapper">`
    );

    // 6 - ENVÍO EL HTML AL NAVEGADOR:
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlConBoton);

  } catch (error) {
    res.status(500).send(`<h1>Error al generar factura: ${error.message}</h1>`);
  }
};

// ── DELETE /facturas-portal/:id - ELIMINA UNA FACTURA (admin only) ──
const eliminarFactura = (req, res) => {
  try {
    const { id } = req.params;

    // 1 - VERIFICO QUE EXISTA:
    const factura = db.prepare(`SELECT id FROM facturas WHERE id = ?`).get(id);
    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    // 2 - ELIMINO (CASCADE borra el detalle automáticamente):
    db.prepare(`DELETE FROM facturas WHERE id = ?`).run(id);

    res.json({ mensaje: 'Factura eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar factura', detalle: error.message });
  }
};

// ── POST /facturas-portal/:id/enviar-mail - ENVÍA EL MAIL DE UNA FACTURA AL CLIENTE ──
const enviarMailFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // 1 - BUSCO LA FACTURA CON TODOS LOS DATOS DEL CLIENTE:
    const factura = db.prepare(`
      SELECT
        f.*,
        cl.razon_social  AS razon_social,
        cl.email         AS cliente_email,
        cl.cuit          AS cliente_cuit,
        cl.telefono      AS cliente_telefono,
        cl.direccion     AS cliente_direccion
      FROM facturas f
      JOIN clientes cl ON cl.id = f.cliente_adm_id
      WHERE f.id = ?
    `).get(id);

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    // 2 - VERIFICO QUE EL CLIENTE TENGA EMAIL REGISTRADO EN SUS DATOS:
    if (!factura.cliente_email) {
      return res.status(400).json({
        error: `El cliente "${factura.razon_social}" no tiene email registrado en sus datos. Agregalo desde la sección Clientes.`
      });
    }

    // 3 - BUSCO EL DETALLE DE LA FACTURA (los servicios):
    const detalle = db.prepare(`
      SELECT descripcion, cantidad, importe FROM detalle_factura WHERE factura_id = ? ORDER BY id ASC
    `).all(id);

    // 4 - TRAIGO LA CONFIGURACIÓN DEL ADMINISTRADOR (para el mail):
    const configFilas = db.prepare(`SELECT clave, valor FROM configuracion`).all();
    const config = {};
    configFilas.forEach(({ clave, valor }) => { config[clave] = valor || ''; });

    // 5 - ARMO EL OBJETO CLIENTE CON LOS DATOS NECESARIOS:
    const cliente = {
      razon_social: factura.razon_social,
      email:        factura.cliente_email,
      cuit:         factura.cliente_cuit,
    };

    // 6 - ENVÍO EL MAIL:
    const resultado = await enviarMailFacturaManual({ cliente, factura, detalle, config });

    if (!resultado.enviado) {
      return res.status(500).json({ error: 'Error al enviar el mail: ' + resultado.razon });
    }

    res.json({ mensaje: `Mail enviado correctamente a ${factura.cliente_email}` });

  } catch (error) {
    res.status(500).json({ error: 'Error al enviar mail', detalle: error.message });
  }
};

// ── GET /facturas-portal/:id/pdf - GENERA EL PDF DE LA FACTURA (mismo que se adjunta al mail) ──
const generarPDFFactura = async (req, res) => {
  try {
    const { id } = req.params;

    // 1 - BUSCO LA FACTURA CON DATOS DEL CLIENTE:
    const factura = db.prepare(`
      SELECT
        f.*,
        c.nombre         AS client_nombre,
        cl.razon_social  AS razon_social,
        cl.cuit          AS cliente_cuit,
        cl.email         AS cliente_email,
        cl.direccion     AS cliente_direccion
      FROM facturas f
      LEFT JOIN clients  c  ON c.id  = f.client_id
      LEFT JOIN clientes cl ON cl.id = f.cliente_adm_id
      WHERE f.id = ?
    `).get(id);

    if (!factura) return res.status(404).json({ error: 'Factura no encontrada' });

    // 2 - TRAIGO EL DETALLE DE ÍTEMS:
    const detalle = getDetalleFactura(id);

    // 3 - TRAIGO LA CONFIGURACIÓN DEL ADMINISTRADOR (proveedor):
    const configFilas = db.prepare(`SELECT clave, valor FROM configuracion`).all();
    const config = {};
    configFilas.forEach(({ clave, valor }) => { config[clave] = valor || ''; });

    // 4 - ARMO EL OBJETO CLIENTE CON LOS DATOS QUE NECESITA EL PDF:
    const cliente = {
      razon_social: factura.razon_social || factura.client_nombre || 'Cliente',
      cuit:         factura.cliente_cuit    || '',
      email:        factura.cliente_email   || '',
      direccion:    factura.cliente_direccion || ''
    };

    // 5 - GENERO EL PDF CON LA MISMA FUNCIÓN QUE USA EL MAIL:
    const pdfBuffer = await crearPdfFacturaBuffer({ cliente, factura, detalle, config });

    // 6 - ENVÍO EL PDF AL NAVEGADOR (se abre / descarga directo):
    const nroFactura = String(factura.id).padStart(4, '0');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="factura_${nroFactura}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    res.status(500).json({ error: 'Error al generar PDF', detalle: error.message });
  }
};

// 10 - EXPORTO TODOS LOS CONTROLADORES:
module.exports = {
  listarFacturas,
  getFacturaPeriodoActual,
  getFacturaById,
  crearFactura,
  marcarPagado,
  generarFacturasPeriodo,
  generarHTMLFactura,
  generarPDFFactura,
  eliminarFactura,
  enviarMailFactura
};
