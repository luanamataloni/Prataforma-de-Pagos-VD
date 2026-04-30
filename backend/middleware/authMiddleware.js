// ============================================================
// MIDDLEWARE DE AUTENTICACIÓN - JWT
// ============================================================

const jwt = require('jsonwebtoken');

// 1 - CLAVE SECRETA PARA FIRMAR LOS TOKENS:
const JWT_SECRET = process.env.JWT_SECRET || 'gestorpagos_jwt_secret_2024';

// 2 - VERIFICO QUE EL TOKEN SEA VÁLIDO Y LO DECODIFICO:
function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token requerido para acceder a este recurso' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }
    // 3 - GUARDO LOS DATOS DEL USUARIO EN req.user:
    req.user = decoded;
    next();
  });
}

// 4 - VERIFICO QUE EL USUARIO SEA ADMINISTRADOR:
function soloAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso restringido: solo administradores' });
  }
  next();
}

module.exports = { verificarToken, soloAdmin, JWT_SECRET };

