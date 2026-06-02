// ============================================================
// RUTAS DE AUTENTICACION
// ============================================================
const express            = require('express');
const router             = express.Router();
const { login, me }      = require('../controllers/authController');
const { verificarToken } = require('../middleware/authMiddleware');
// 1 - LOGIN (publica):
router.post('/login', login);
// 2 - VERIFICAR TOKEN Y OBTENER USUARIO ACTUAL (protegida):
router.get('/me', verificarToken, me);
module.exports = router;
