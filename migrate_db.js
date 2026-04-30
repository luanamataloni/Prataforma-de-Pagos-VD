const db = require('./backend/database/db.js');
try {
  db.prepare("ALTER TABLE facturas ADD COLUMN comprobante TEXT").run();
  console.log("Columna 'comprobante' agregada a 'facturas'");
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log("La columna 'comprobante' ya existe.");
  } else {
    console.error("Error al agregar columna:", e.message);
  }
}
process.exit(0);

