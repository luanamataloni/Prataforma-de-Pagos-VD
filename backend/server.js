// ============================================================
// SERVIDOR PRINCIPAL - EXPRESS
// ============================================================

// 1 - IMPORTO LAS DEPENDENCIAS:
const express = require('express');
const cors    = require('cors');
const path = require('path');

// 2 - IMPORTO LAS RUTAS:
const rutasServicios      = require('./routes/servicios');
const rutasClientes       = require('./routes/clientes');
const rutasFactura        = require('./routes/factura');
const rutasAuth           = require('./routes/authRoutes');
const rutasClientsPortal  = require('./routes/clientsPortalRoutes');
const rutasFacturasPortal = require('./routes/facturasPortalRoutes');
const rutasConfiguracion  = require('./routes/configuracion');

// 3 - IMPORTO EL SERVICIO DE FACTURA (para generar cobros al iniciar):
const { generarTodosPagosPendientes, migrarPagosAFacturas } = require('./services/facturaService');

// 4 - CREO LA APP DE EXPRESS:
const app  = express();
const PORT = process.env.PORT || 3001;

// 5 - CONFIGURO LOS MIDDLEWARES:
app.use(cors());
app.use(express.json());

// 11 - SIRVO LA CARPETA DE UPLOADS COMO ESTÁTICA:
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6 - REGISTRO LAS RUTAS:
app.use('/servicios',       rutasServicios);
app.use('/clientes',        rutasClientes);
app.use('/factura',         rutasFactura);
app.use('/auth',            rutasAuth);
app.use('/portal/clients',  rutasClientsPortal);
app.use('/facturas-portal', rutasFacturasPortal);
app.use('/configuracion',   rutasConfiguracion);

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

  // 10 - AL INICIAR, GENERO COBROS PENDIENTES DEL PERIODO ACTUAL:
  try {
    const pagosCreados = generarTodosPagosPendientes();
    if (pagosCreados > 0) {
      console.log(`💰 Se generaron ${pagosCreados} nuevos cobros pendientes al iniciar`);
    }
  } catch (err) {
    console.warn('⚠️  No se pudieron generar cobros al iniciar:', err.message);
  }

  // 11 - MIGRO PAGOS EXISTENTES A FACTURAS (idempotente: solo migra lo que falta):
  try {
    const migradas = migrarPagosAFacturas();
    if (migradas > 0) {
      console.log(`📄 Se migraron ${migradas} facturas desde el sistema de pagos anterior`);
    }
  } catch (err) {
    console.warn('⚠️  No se pudieron migrar pagos a facturas:', err.message);
  }
});
