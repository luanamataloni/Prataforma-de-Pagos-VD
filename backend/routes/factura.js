// ============================================================
// RUTAS DE FACTURA
// ============================================================

// 1 - IMPORTO LAS DEPENDENCIAS:
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');

// 2 - IMPORTO EL CONTROLADOR DE FACTURA Y EL MIDDLEWARE DE AUTH:
const facturaController             = require('../controllers/facturaController');
const { verificarToken }            = require('../middleware/authMiddleware');

// 3 - CONFIGURO MULTER PARA ALMACENAR LOS COMPROBANTES:
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './backend/uploads/');
  },
  filename: (req, file, cb) => {
    // Nombre: comprobante_id_timestamp.ext
    const extension = path.extname(file.originalname);
    cb(null, `comprobante_${req.params.id}_${Date.now()}${extension}`);
  }
});

const upload = multer({ storage });

// 4 - DEFINO LAS RUTAS (stats y generar van ANTES de /:id para evitar conflictos):
router.get('/stats',    facturaController.obtenerEstadisticas);
router.post('/generar', facturaController.generarPagos);
router.get('/',         facturaController.listarPagos);
router.put('/:id',      facturaController.actualizarPago);

// 5 - RUTA PARA SUBIR COMPROBANTE:
router.post('/:id/upload', upload.single('comprobante'), facturaController.subirComprobante);

// 6 - RUTA PARA SUBIR COMPROBANTE DE FACTURA DEL PORTAL:
// El cliente sube su comprobante → se guarda y se notifica a todos los admins.
router.post('/portal/:id/upload', verificarToken, upload.single('comprobante'), (req, res) => {
  try {
    const { id } = req.params;
    const file   = req.file;
    const db     = require('../database/db');

    if (!file) return res.status(400).json({ error: 'No se subió ningún archivo' });

    // 6a - GUARDO LA RUTA DEL COMPROBANTE EN LA FACTURA:
    const rutaArchivo = `/uploads/${file.filename}`;
    db.prepare(`UPDATE facturas SET comprobante = ? WHERE id = ?`).run(rutaArchivo, id);

    // 6b - BUSCO DATOS DE LA FACTURA PARA ARMAR EL MENSAJE:
    const factura = db.prepare(`
      SELECT f.periodo, cl.razon_social
      FROM   facturas f
      LEFT JOIN clientes cl ON cl.id = f.cliente_adm_id
      WHERE  f.id = ?
    `).get(id);

    if (factura) {
      // 6c - FORMATEO EL PERIODO A TEXTO LEGIBLE:
      const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const [anio, mes]  = (factura.periodo || '').split('-');
      const periodoLabel = mes ? `${meses[parseInt(mes)]} ${anio}` : anio;
      const nombreCliente = factura.razon_social || 'Un cliente';
      const nroFactura    = String(id).padStart(4, '0');

      const mensajeNotif = `📎 ${nombreCliente} subió el comprobante de pago para la factura #${nroFactura} del período ${periodoLabel}`;

      // 6d - NOTIFICO A TODOS LOS ADMINISTRADORES:
      const admins = db.prepare(`SELECT id FROM users WHERE role = 'admin'`).all();
      const insertNotif = db.prepare(`
        INSERT INTO notificaciones (tipo, factura_id, para_user_id, mensaje)
        VALUES ('comprobante_subido', ?, ?, ?)
      `);
      for (const admin of admins) {
        insertNotif.run(id, admin.id, mensajeNotif);
      }
    }

    res.json({ mensaje: 'Comprobante subido con éxito', ruta: rutaArchivo });

  } catch (error) {
    res.status(500).json({ error: 'Error al subir comprobante', detalle: error.message });
  }
});

// 7 - EXPORTO EL ROUTER:
module.exports = router;
