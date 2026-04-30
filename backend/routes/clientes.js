// ============================================================
// RUTAS DE CLIENTES
// ============================================================

// 1 - IMPORTO EXPRESS Y EL CONTROLADOR:
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/clientesController');
const multer     = require('multer');
const path       = require('path');

// CONFIGURACIÓN DE MULTER PARA FOTOS DE PERFIL:
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'backend/uploads/clientes/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'perfil-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// 2 - DEFINO LAS RUTAS DE CLIENTES:
router.get('/',     controller.listarClientes);
router.get('/:id',  controller.obtenerCliente);
router.post('/',    upload.single('foto'), controller.crearCliente);
router.put('/:id',  upload.single('foto'), controller.actualizarCliente);
router.delete('/:id', controller.eliminarCliente);

// 3 - DEFINO LAS RUTAS DE ASIGNACIÓN DE SERVICIOS A CLIENTES:
router.post('/:id/servicios',               controller.asignarServicio);
router.delete('/:id/servicios/:servicioId', controller.quitarServicio);

// 4 - DEFINO LA RUTA DE FACTURAS DE UN CLIENTE:
router.get('/:id/factura', controller.obtenerPagosCliente);

// 5 - EXPORTO EL ROUTER:
module.exports = router;
