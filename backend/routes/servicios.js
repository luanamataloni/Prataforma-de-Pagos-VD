// ============================================================
// RUTAS DE SERVICIOS
// ============================================================

// 1 - IMPORTO EXPRESS Y EL CONTROLADOR:
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/serviciosController');

// 2 - DEFINO LAS RUTAS:
router.get('/',     controller.listarServicios);
router.get('/:id',  controller.obtenerServicio);
router.post('/',    controller.crearServicio);
router.put('/:id',  controller.actualizarServicio);
router.delete('/:id', controller.eliminarServicio);

// 3 - EXPORTO EL ROUTER:
module.exports = router;

