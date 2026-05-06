// ============================================================
// RUTAS DE NOTIFICACIONES
// ============================================================

// 1 - IMPORTO DEPENDENCIAS:
const express = require('express');
const router  = express.Router();

// 2 - IMPORTO EL CONTROLADOR:
const {
  listarNotificaciones,
  marcarLeida,
  marcarTodasLeidas
} = require('../controllers/notificacionesController');

const { verificarToken } = require('../middleware/authMiddleware');

// 3 - RUTAS:
router.get('/',                  verificarToken, listarNotificaciones); // 3a - LISTAR TODAS:
router.put('/leer-todas',        verificarToken, marcarTodasLeidas);    // 3b - MARCAR TODAS COMO LEÍDAS:
router.put('/:id/leer',          verificarToken, marcarLeida);          // 3c - MARCAR UNA COMO LEÍDA:

// 4 - EXPORTO EL ROUTER:
module.exports = router;

