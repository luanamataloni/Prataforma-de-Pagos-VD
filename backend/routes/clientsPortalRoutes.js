// ============================================================
// RUTAS DE CLIENTES DEL PORTAL
// ============================================================
const express                        = require('express');
const router                         = express.Router();
const { listarClientsPortal, crearClient } = require('../controllers/clientsPortalController');
const { verificarToken, soloAdmin }  = require('../middleware/authMiddleware');
// 1 - LISTAR CLIENTS (admin only):
router.get('/',  verificarToken, soloAdmin, listarClientsPortal);
// 2 - CREAR CLIENT CON USUARIO (admin only):
router.post('/', verificarToken, soloAdmin, crearClient);
module.exports = router;
