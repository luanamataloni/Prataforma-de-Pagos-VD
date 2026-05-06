// ============================================================
// CONTROLADOR: NOTIFICACIONES DEL SISTEMA
// ============================================================

// 1 - IMPORTO LA CONEXIÓN A LA DB:
const db = require('../database/db');

// ── GET /notificaciones - LISTA LAS NOTIFICACIONES DEL USUARIO ACTUAL ──
const listarNotificaciones = (req, res) => {
  try {

    // 2 - BUSCO LAS NOTIFICACIONES DEL USUARIO QUE ESTÁ LOGUEADO:
    const notifs = db.prepare(`
      SELECT *
      FROM   notificaciones
      WHERE  para_user_id = ?
      ORDER  BY created_at DESC
      LIMIT  50
    `).all(req.user.id);

    res.json(notifs);

  } catch (error) {
    res.status(500).json({ error: 'Error al obtener notificaciones', detalle: error.message });
  }
};

// ── PUT /notificaciones/:id/leer - MARCA UNA NOTIFICACIÓN COMO LEÍDA ──
const marcarLeida = (req, res) => {
  try {
    const { id } = req.params;

    // 3 - MARCO COMO LEÍDA (solo si pertenece al usuario):
    db.prepare(`
      UPDATE notificaciones SET leida = 1
      WHERE  id = ? AND para_user_id = ?
    `).run(id, req.user.id);

    res.json({ mensaje: 'Notificación marcada como leída' });

  } catch (error) {
    res.status(500).json({ error: 'Error al marcar notificación', detalle: error.message });
  }
};

// ── PUT /notificaciones/leer-todas - MARCA TODAS LAS NOTIFICACIONES COMO LEÍDAS ──
const marcarTodasLeidas = (req, res) => {
  try {

    // 4 - MARCO TODAS LAS DEL USUARIO COMO LEÍDAS:
    db.prepare(`
      UPDATE notificaciones SET leida = 1
      WHERE  para_user_id = ?
    `).run(req.user.id);

    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas' });

  } catch (error) {
    res.status(500).json({ error: 'Error al marcar notificaciones', detalle: error.message });
  }
};

// 5 - EXPORTO LOS CONTROLADORES:
module.exports = { listarNotificaciones, marcarLeida, marcarTodasLeidas };

