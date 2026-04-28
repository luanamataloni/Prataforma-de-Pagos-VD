// ============================================================
// RUTAS DE CLIENTES
// ============================================================

// 1 - IMPORTO EXPRESS Y EL CONTROLADOR:
const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/clientesController');

// 2 - DEFINO LAS RUTAS DE CLIENTES:
router.get('/',     controller.listarClientes);
router.get('/:id',  controller.obtenerCliente);
router.post('/',    controller.crearCliente);
router.put('/:id',  controller.actualizarCliente);
router.delete('/:id', controller.eliminarCliente);

// 3 - DEFINO LAS RUTAS DE ASIGNACIÓN DE SERVICIOS A CLIENTES:
router.post('/:id/servicios',               controller.asignarServicio);
router.delete('/:id/servicios/:servicioId', controller.quitarServicio);

// 4 - DEFINO LA RUTA DE PAGOS DE UN CLIENTE (delegada al controlador de pagos):
const pagosController = require('../controllers/pagosController');
router.get('/:id/pagos', pagosController.listarPagosDeCliente);

// 5 - EXPORTO EL ROUTER:
module.exports = router;

