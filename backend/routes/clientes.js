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

// 4 - DEFINO LA RUTA DE FACTURAS DE UN CLIENTE:
router.get('/:id/factura', controller.obtenerPagosCliente);

// 5 - EXPORTO EL ROUTER:
module.exports = router;

