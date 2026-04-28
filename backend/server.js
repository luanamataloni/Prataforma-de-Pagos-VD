// ============================================================
// SERVIDOR PRINCIPAL - EXPRESS
// ============================================================

// 1 - IMPORTO LAS DEPENDENCIAS:
const express = require('express');
const cors    = require('cors');
const path = require('path');

// 2 - IMPORTO LAS RUTAS:
const rutasServicios = require('./routes/servicios');
const rutasClientes  = require('./routes/clientes');
const rutasPagos     = require('./routes/pagos');

// 3 - IMPORTO EL SERVICIO DE PAGOS (para generar pagos al iniciar):
const { generarTodosPagosPendientes } = require('./services/pagosService');

// 4 - CREO LA APP DE EXPRESS:
const app  = express();
const PORT = process.env.PORT || 3001;

// 5 - CONFIGURO LOS MIDDLEWARES:
app.use(cors());
app.use(express.json());

// 11 - SIRVO LA CARPETA DE UPLOADS COMO ESTÁTICA:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6 - REGISTRO LAS RUTAS:
app.use('/servicios', rutasServicios);
app.use('/clientes',  rutasClientes);
app.use('/pagos',     rutasPagos);

// 7 - RUTA RAÍZ PARA VERIFICAR QUE EL SERVER ESTÁ VIVO:
app.get('/', (req, res) => {
  res.json({ mensaje: '✅ Servidor de Pagos funcionando correctamente', version: '1.0.0' });
});

// 8 - MANEJO DE RUTAS NO ENCONTRADAS:
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// 9 - INICIO EL SERVIDOR:
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

  // 10 - AL INICIAR, GENERO PAGOS PENDIENTES DEL PERIODO ACTUAL:
  try {
    const pagosCreados = generarTodosPagosPendientes();
    if (pagosCreados > 0) {
      console.log(`💰 Se generaron ${pagosCreados} nuevos pagos pendientes al iniciar`);
    }
  } catch (err) {
    console.warn('⚠️  No se pudieron generar pagos al iniciar:', err.message);
  }
});
