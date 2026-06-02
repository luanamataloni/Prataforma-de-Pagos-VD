// ============================================================
// RUTAS DE FACTURAS DEL PORTAL
// ============================================================

// 1 - IMPORTO DEPENDENCIAS:
const express = require('express');
const router  = express.Router();

// 2 - IMPORTO EL CONTROLADOR CON TODAS LAS FUNCIONES:
const {
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
} = require('../controllers/facturasPortalController');

const { verificarToken, soloAdmin } = require('../middleware/authMiddleware');

// 3 - RUTAS ESTÁTICAS (van ANTES de /:id para evitar conflictos):

router.get('/periodo-actual', verificarToken, getFacturaPeriodoActual); // 3a - VER FACTURA DEL PERIODO ACTUAL (cliente):
router.post('/generar-periodo', verificarToken, soloAdmin, generarFacturasPeriodo); // 3b - GENERAR FACTURAS PARA UN PERÍODO COMPLETO (admin only):
router.get('/', verificarToken, listarFacturas); // 3c - LISTAR TODAS LAS FACTURAS:
router.post('/', verificarToken, soloAdmin, crearFactura); // 3d - CREAR FACTURA CON DETALLE (admin only):


// 4 - RUTAS DINÁMICAS (/:id):

router.get('/:id', verificarToken, getFacturaById); // 4a - OBTENER UNA FACTURA POR ID CON DETALLE:
router.get('/:id/html', generarHTMLFactura); // 4b - GENERAR HTML DE LA FACTURA PARA IMPRIMIR (sin auth, acceso directo):
router.get('/:id/pdf',  generarPDFFactura);  // 4c - DESCARGAR EL PDF (mismo que se adjunta al mail, sin auth):
router.put('/:id/pagar', verificarToken, marcarPagado); // 4d - MARCAR COMO PAGADA:
router.post('/:id/enviar-mail', verificarToken, soloAdmin, enviarMailFactura); // 4e - ENVIAR MAIL DE FACTURA AL CLIENTE (admin only):
router.delete('/:id', verificarToken, soloAdmin, eliminarFactura); // 4f - ELIMINAR FACTURA (admin only):

// 5 - EXPORTO EL ROUTER:
module.exports = router;
