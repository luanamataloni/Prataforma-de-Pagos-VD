// ============================================================
// BASE DE DATOS - CONEXIÓN Y CREACIÓN DE TABLAS
// ============================================================

// 1 - IMPORTO LAS DEPENDENCIAS NECESARIAS:
const Database = require('better-sqlite3');
const path = require('path');

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

// 6 - EXPORTO LA CONEXIÓN PARA USARLA EN TODA LA APP:
module.exports = db;
