// ============================================================
// RUTAS DE PAGOS
// ============================================================

// 1 - IMPORTO LAS DEPENDENCIAS:
const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const pagosController = require('../controllers/pagosController');

// 2 - CONFIGURO MULTER PARA ALMACENAR LOS COMPROBANTES:
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './backend/uploads/');
  },
  filename: (req, file, cb) => {
    // Nombre: pago_id_timestamp.ext
    const extension = path.extname(file.originalname);
    cb(null, `comprobante_${req.params.id}_${Date.now()}${extension}`);
  }
});

const upload = multer({ storage });

// 3 - DEFINO LAS RUTAS:
router.get('/stats',    pagosController.obtenerEstadisticas);   // IMPORTANTE: va antes de /:id
router.post('/generar', pagosController.generarPagos);
router.get('/',         pagosController.listarPagos);
router.post('/',        pagosController.crearPago);
router.put('/:id',      pagosController.actualizarPago);

// 4 - RUTA PARA SUBIR COMPROBANTE:
router.post('/:id/upload', upload.single('comprobante'), pagosController.subirComprobante);

// 5 - EXPORTO EL ROUTER:
module.exports = router;
