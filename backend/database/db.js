// ============================================================
// BASE DE DATOS - CONEXIÓN Y CREACIÓN DE TABLAS
// ============================================================

// 1 - IMPORTO LAS DEPENDENCIAS NECESARIAS:
const Database = require('better-sqlite3');
const bcrypt   = require('bcryptjs');
const path     = require('path');

// 2 - DEFINO LA RUTA DONDE SE GUARDARÁ EL ARCHIVO .db:
const DB_PATH = path.join(__dirname, 'pagos.db');

// 3 - ME CONECTO A LA BASE DE DATOS (la crea si no existe):
const db = new Database(DB_PATH);

// 4 - ACTIVO LAS FOREIGN KEYS PARA RESPETAR RELACIONES:
db.pragma('foreign_keys = ON');

// 5 - CREO LAS TABLAS SI NO EXISTEN:
db.exec(`

  -- TABLA DE SERVICIOS:
  CREATE TABLE IF NOT EXISTS servicios (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre           TEXT    NOT NULL,
    descripcion      TEXT,
    precio           REAL    NOT NULL,
    tipo_facturacion TEXT    NOT NULL CHECK(tipo_facturacion IN ('mensual', 'anual')),
    created_at       TEXT    DEFAULT (datetime('now'))
  );

  -- TABLA DE CLIENTES:
  CREATE TABLE IF NOT EXISTS clientes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social  TEXT NOT NULL,
    cuit          TEXT,
    direccion     TEXT,
    email         TEXT,
    telefono      TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  );

  -- TABLA DE RELACIÓN CLIENTE-SERVICIO (asignaciones):
  CREATE TABLE IF NOT EXISTS cliente_servicios (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id       INTEGER NOT NULL,
    servicio_id      INTEGER NOT NULL,
    fecha_asignacion TEXT    NOT NULL DEFAULT (date('now')),
    FOREIGN KEY (cliente_id)  REFERENCES clientes(id)  ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE,
    UNIQUE(cliente_id, servicio_id)
  );

  -- TABLA DE PAGOS:
  CREATE TABLE IF NOT EXISTS pagos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id  INTEGER NOT NULL,
    servicio_id INTEGER NOT NULL,
    periodo     TEXT    NOT NULL,
    tipo        TEXT    NOT NULL CHECK(tipo IN ('mensual', 'anual')),
    monto       REAL    NOT NULL,
    estado      TEXT    NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagado')),
    fecha_pago  TEXT,
    comprobante TEXT, -- 14 - AGREGADO CAMPO PARA RUTA DEL ARCHIVO
    FOREIGN KEY (cliente_id)  REFERENCES clientes(id)  ON DELETE CASCADE,
    FOREIGN KEY (servicio_id) REFERENCES servicios(id) ON DELETE CASCADE
  );

`);

// 6 - CREO LAS TABLAS DEL SISTEMA DE ROLES Y FACTURACIÓN:
db.exec(`

  -- TABLA DE USUARIOS (AUTH):
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'client' CHECK(role IN ('admin', 'client')),
    created_at TEXT    DEFAULT (datetime('now'))
  );

  -- TABLA DE CLIENTES DEL PORTAL (FK -> users):
  CREATE TABLE IF NOT EXISTS clients (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE,
    nombre     TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- TABLA DE FACTURAS DEL PORTAL (FK -> clients):
  CREATE TABLE IF NOT EXISTS facturas (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id  INTEGER NOT NULL,
    periodo    TEXT    NOT NULL,
    total      REAL    NOT NULL DEFAULT 0,
    estado     TEXT    NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagado')),
    comprobante TEXT, -- AGREGADO CAMPO PARA RUTA DEL ARCHIVO
    created_at TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  -- TABLA DE DETALLE DE FACTURA (FK -> facturas):
  CREATE TABLE IF NOT EXISTS detalle_factura (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    factura_id  INTEGER NOT NULL,
    descripcion TEXT    NOT NULL,
    cantidad    INTEGER NOT NULL DEFAULT 1,
    importe     REAL    NOT NULL,
    FOREIGN KEY (factura_id) REFERENCES facturas(id) ON DELETE CASCADE
  );

`);

// 7 - SEED: CREO LOS USUARIOS DE PRUEBA SI NO EXISTEN:
try {
  // 7a - USUARIO ADMINISTRADOR:
  const adminExiste = db.prepare(`SELECT id FROM users WHERE email = ?`).get('administrador@test.com');
  if (!adminExiste) {
    const hash = bcrypt.hashSync('123456', 10);
    db.prepare(`INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')`).run('administrador@test.com', hash);
    console.log('✅ Admin creado: administrador@test.com / 123456');
  }

  // 7b - USUARIO CLIENTE:
  const clienteExiste = db.prepare(`SELECT id FROM users WHERE email = ?`).get('cliente@test.com');
  if (!clienteExiste) {
    const hash = bcrypt.hashSync('123456', 10);
    const result = db.prepare(`INSERT INTO users (email, password, role) VALUES (?, ?, 'client')`).run('cliente@test.com', hash);
    db.prepare(`INSERT INTO clients (user_id, nombre) VALUES (?, ?)`).run(result.lastInsertRowid, 'Cliente Test');
    console.log('✅ Cliente creado: cliente@test.com / 123456');
  }
} catch (seedErr) {
  // Silencioso: los usuarios ya existen
}

// 8 - MIGRACIÓN DE LA TABLA FACTURAS:
// Agrego cliente_adm_id y hago client_id nullable para soportar facturas de clientes admin
try {
  const cols = db.prepare("PRAGMA table_info(facturas)").all();
  const yaExisteClienteAdmId = cols.some(c => c.name === 'cliente_adm_id');
  const clientIdEsNotNull    = cols.find(c => c.name === 'client_id')?.notnull === 1;

  if (!yaExisteClienteAdmId || clientIdEsNotNull) {
    // 8a - DESACTIVO FOREIGN KEYS PARA LA MIGRACIÓN:
    db.pragma('foreign_keys = OFF');

    // 8b - CREO LA NUEVA TABLA CON EL ESQUEMA ACTUALIZADO:
    db.exec(`
      CREATE TABLE IF NOT EXISTS facturas_v2 (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id      INTEGER,
        cliente_adm_id INTEGER,
        periodo        TEXT    NOT NULL,
        total          REAL    NOT NULL DEFAULT 0,
        estado         TEXT    NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente', 'pagado')),
        comprobante    TEXT,
        created_at     TEXT    DEFAULT (datetime('now')),
        FOREIGN KEY (client_id)      REFERENCES clients(id)  ON DELETE CASCADE,
        FOREIGN KEY (cliente_adm_id) REFERENCES clientes(id) ON DELETE CASCADE
      );
    `);

    // 8c - COPIO LOS DATOS EXISTENTES A LA NUEVA TABLA:
    db.exec(`
      INSERT OR IGNORE INTO facturas_v2 (id, client_id, periodo, total, estado, comprobante, created_at)
      SELECT id, client_id, periodo, total, estado, comprobante, created_at FROM facturas;
    `);

    // 8d - REEMPLAZO LA TABLA VIEJA POR LA NUEVA:
    db.exec(`DROP TABLE facturas;`);
    db.exec(`ALTER TABLE facturas_v2 RENAME TO facturas;`);

    // 8e - REACTIVO FOREIGN KEYS:
    db.pragma('foreign_keys = ON');
    console.log('✅ Migración facturas: cliente_adm_id agregado, client_id nullable');
  }
} catch (migErr) {
  db.pragma('foreign_keys = ON');
  console.warn('⚠️  Migración facturas (no crítico):', migErr.message);
}

// 9 - CREO LA TABLA DE CONFIGURACIÓN DEL PROVEEDOR (datos del admin):
db.exec(`
  CREATE TABLE IF NOT EXISTS configuracion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    clave        TEXT NOT NULL UNIQUE,
    valor        TEXT
  );
`);

// 9a - INSERTO LOS VALORES POR DEFECTO SI NO EXISTEN:
const configDefaults = [
  { clave: 'razon_social', valor: '' },
  { clave: 'rubro',        valor: '' },
  { clave: 'cuit',         valor: '' },
  { clave: 'direccion',    valor: '' },
  { clave: 'telefono',     valor: '' },
];
const insertConfig = db.prepare(`INSERT OR IGNORE INTO configuracion (clave, valor) VALUES (?, ?)`);
configDefaults.forEach(({ clave, valor }) => insertConfig.run(clave, valor));

// 10 - MIGRACIÓN: AGREGO user_id A LA TABLA clientes PARA VINCULAR ACCESO AL PORTAL:
try {
  const colsClientes = db.prepare("PRAGMA table_info(clientes)").all();
  const yaExisteUserId = colsClientes.some(c => c.name === 'user_id');
  if (!yaExisteUserId) {
    // 10a - AGREGO LA COLUMNA user_id (nullable, FK a users):
    db.exec(`ALTER TABLE clientes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
    console.log('✅ Migración clientes: columna user_id agregada');
  }
} catch (migErr) {
  console.warn('⚠️  Migración clientes user_id (no crítico):', migErr.message);
}

// 11 - EXPORTO LA CONEXIÓN PARA USARLA EN TODA LA APP:
module.exports = db;

