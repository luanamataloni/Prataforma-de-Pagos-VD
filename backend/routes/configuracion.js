// ============================================================
// RUTAS: CONFIGURACIÓN DEL PROVEEDOR
// ============================================================

// 1 - IMPORTO EXPRESS Y EL MIDDLEWARE DE AUTH:
const express    = require('express');
const router     = express.Router();
const { verificarToken, soloAdmin } = require('../middleware/authMiddleware');

// 2 - IMPORTO EL CONTROLADOR:
const { getConfiguracion, updateConfiguracion } = require('../controllers/configuracionController');

// 3 - RUTAS (solo admin puede acceder):
router.get('/',  verificarToken, soloAdmin, getConfiguracion);
router.put('/',  verificarToken, soloAdmin, updateConfiguracion);

module.exports = router;

