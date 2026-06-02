// ============================================================
// CONTROLADOR: CLIENTES DEL PORTAL (vinculados a users)
// ============================================================
const bcrypt = require('bcryptjs');
const db     = require('../database/db');
// GET /portal/clients - LISTA TODOS LOS CLIENTES DEL PORTAL (admin only)
const listarClientsPortal = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT c.*, u.email
      FROM clients c
      JOIN users u ON u.id = c.user_id
      ORDER BY c.nombre ASC
    `).all();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar clientes del portal', detalle: error.message });
  }
};
// POST /portal/clients - CREA UN CLIENTE Y SU CUENTA DE USUARIO
const crearClient = async (req, res) => {
  try {
    const { nombre, email, password } = req.body;
    if (!nombre || !email || !password) {
      return res.status(400).json({ error: 'nombre, email y password son requeridos' });
    }
    // 1 - VERIFICO QUE EL EMAIL NO ESTE EN USO:
    const emailExiste = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (emailExiste) return res.status(409).json({ error: 'El email ya esta registrado' });
    // 2 - HASHEO LA CONTRASENA:
    const hashedPassword = await bcrypt.hash(password, 10);
    // 3 - CREO EL USUARIO:
    const userResult = db.prepare(`INSERT INTO users (email, password, role) VALUES (?, ?, 'client')`).run(email, hashedPassword);
    // 4 - CREO EL REGISTRO EN clients CON user_id COMO FK:
    const clientResult = db.prepare(`INSERT INTO clients (user_id, nombre) VALUES (?, ?)`).run(userResult.lastInsertRowid, nombre);
    // 5 - DEVUELVO EL CLIENTE CREADO:
    const nuevoClient = db.prepare(`SELECT c.*, u.email FROM clients c JOIN users u ON u.id = c.user_id WHERE c.id = ?`).get(clientResult.lastInsertRowid);
    res.status(201).json(nuevoClient);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cliente', detalle: error.message });
  }
};
module.exports = { listarClientsPortal, crearClient };
