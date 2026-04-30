// ============================================================
// CONTROLADOR DE AUTENTICACIÓN - LOGIN / ME
// ============================================================

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../database/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// ── POST /auth/login - INICIO DE SESIÓN ──
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos' });

    // 1 - BUSCO EL USUARIO POR EMAIL:
    const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email);
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    // 2 - VERIFICO LA CONTRASEÑA:
    const passwordOk = await bcrypt.compare(password, user.password);
    if (!passwordOk) return res.status(401).json({ error: 'Credenciales inválidas' });

    // 3 - GENERO EL TOKEN JWT (24 horas):
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 4 - SI ES CLIENTE, TRAIGO SU client.id VIA user_id:
    let clientData = null;
    if (user.role === 'client') {
      clientData = db.prepare(`SELECT * FROM clients WHERE user_id = ?`).get(user.id);
    }

    res.json({ token, user: { id: user.id, email: user.email, role: user.role }, client: clientData });
  } catch (error) {
    res.status(500).json({ error: 'Error en el login', detalle: error.message });
  }
};

// ── GET /auth/me - DEVUELVE EL USUARIO DEL TOKEN ACTIVO ──
const me = (req, res) => {
  try {
    // 1 - BUSCO EL USUARIO (req.user viene del middleware):
    const user = db.prepare(`SELECT id, email, role FROM users WHERE id = ?`).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    // 2 - SI ES CLIENTE, TRAIGO SU REGISTRO clients:
    let clientData = null;
    if (user.role === 'client') {
      clientData = db.prepare(`SELECT * FROM clients WHERE user_id = ?`).get(user.id);
    }

    res.json({ user, client: clientData });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario', detalle: error.message });
  }
};

module.exports = { login, me };

