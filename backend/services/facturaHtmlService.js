// ============================================================
// SERVICIO COMPARTIDO: GENERA EL HTML DE LA FACTURA
// ============================================================
// Este archivo es usado tanto por:
//   - facturasPortalController.js  (para mostrar en el navegador)
//   - emailService.js              (para generar el PDF adjunto al mail)
// Así el PDF del mail es IDÉNTICO al que se ve en el portal.
// ============================================================

// ── HELPER: FORMATEA MONTO EN PESOS ARGENTINOS ──
function fmt(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(n);
}

// ── HELPER: FORMATEA PERIODO YYYY-MM A TEXTO LEGIBLE ──
function fmtPeriodo(p) {
  if (!p) return '';
  const meses = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const [anio, mes] = p.split('-');
  return mes ? `${meses[parseInt(mes)]} ${anio}` : anio;
}

// ── FUNCIÓN PRINCIPAL: ARMA EL HTML COMPLETO DE LA FACTURA ──
// Recibe los datos ya obtenidos de la DB y devuelve un string HTML.
function generarHTMLFacturaString({ factura, detalle, config }) {

  // 1 - ARMO LOS DATOS DE DISPLAY DEL CLIENTE Y PROVEEDOR:
  const nombreCliente = factura.razon_social || factura.client_nombre || 'Cliente';
  const cuit          = factura.cliente_cuit      || '';
  const emailCliente  = factura.cliente_email     || '';
  const direccion     = factura.cliente_direccion || '';
  const periodoLabel  = fmtPeriodo(factura.periodo);
  const fechaCreacion = factura.created_at
    ? factura.created_at.replace('T', ' ').substring(0, 16)
    : new Date().toISOString().replace('T', ' ').substring(0, 16);

  // 2 - GENERO LAS FILAS DE DETALLE EN HTML:
  const filasDetalle = detalle.map(item => `
    <tr>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB;">${item.descripcion}</td>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB; text-align:center;">${item.cantidad}</td>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB; text-align:right;">${fmt(item.importe)}</td>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB; text-align:right; font-weight:700; color:#7C3AED;">${fmt(item.importe * item.cantidad)}</td>
    </tr>
  `).join('');

  // 3 - CONSTRUYO EL HTML COMPLETO (mismo que se muestra en el navegador):
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Factura N° ${factura.id} - ${nombreCliente}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    /* ── RESET Y TIPOGRAFÍA ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #F4F4F8;
      color: #1A1A2E;
      padding: 32px 16px;
      -webkit-font-smoothing: antialiased;
    }

    /* ── CONTENEDOR PRINCIPAL ── */
    .factura-wrapper {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 760px;
      margin: 0 auto;
      overflow: hidden;
    }

    /* ── CABECERA CON COLOR ── */
    .factura-header {
      background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);
      color: #fff;
      padding: 36px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .factura-header .logo-area h1 {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .factura-header .logo-area p {
      font-size: 0.85rem;
      opacity: 0.8;
      margin-top: 4px;
      color: #fff;
    }
    .factura-header .num-area { text-align: right; }
    .factura-header .num-area .num-label {
      font-size: 0.75rem;
      font-weight: 600;
      opacity: 0.75;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .factura-header .num-area .num-value {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1;
      margin-top: 4px;
    }

    /* ── BLOQUE DE INFO (CLIENTE + PROVEEDOR + PERÍODO) ── */
    .factura-info {
      display: flex;
      gap: 0;
      padding: 32px 40px;
      border-bottom: 1px solid #E5E7EB;
    }
    .info-block { flex: 1; padding: 0 20px; text-align: left; }
    .info-block:first-child { padding-left: 0; }
    .info-block:last-child  { padding-right: 0; }
    .info-block + .info-block { border-left: 1px solid #E5E7EB; }
    .info-block--proveedor { padding: 0 20px !important; }
    .info-block .block-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #9CA3AF;
      margin-bottom: 8px;
    }
    .info-block .block-value {
      font-size: 1.05rem;
      font-weight: 700;
      color: #1A1A2E;
    }
    .info-block .block-sub {
      font-size: 0.82rem;
      color: #6B7280;
      margin-top: 3px;
      line-height: 1.5;
    }

    /* ── BADGE DE ESTADO ── */
    .estado-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 700;
      margin-top: 8px;
    }
    .estado-badge.pagado    { background: #F0FDF4; color: #22C55E; }
    .estado-badge.pendiente { background: #EFF6FF; color: #3B82F6; }

    /* ── TABLA DE SERVICIOS ── */
    .factura-table-wrapper { padding: 0 40px 24px; }
    .factura-table-wrapper h3 {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: #9CA3AF;
      margin: 24px 0 12px;
    }
    .factura-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .factura-table thead tr { background: #F4F4F8; }
    .factura-table thead th {
      padding: 10px 16px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #9CA3AF;
      text-align: left;
    }
    .factura-table thead th:not(:first-child) { text-align: center; }
    .factura-table thead th:last-child { text-align: right; }
    .factura-table tbody tr:last-child td { border-bottom: none; }

    /* ── TOTALES ── */
    .factura-total {
      display: flex;
      justify-content: flex-end;
      padding: 20px 40px 32px;
      border-top: 2px solid #EDE9FE;
      background: #FAFAFA;
    }
    .total-box { text-align: right; }
    .total-box .total-label {
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #9CA3AF;
      margin-bottom: 6px;
    }
    .total-box .total-value {
      font-size: 2rem;
      font-weight: 800;
      color: #7C3AED;
      line-height: 1;
    }

    /* ── PIE DE FACTURA ── */
    .factura-footer {
      padding: 20px 40px;
      border-top: 1px solid #E5E7EB;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.78rem;
      color: #9CA3AF;
    }

    /* ── BOTÓN IMPRIMIR (oculto en PDF/puppeteer) ── */
    .print-btn { display: none; }

    /* ── ESTILOS DE IMPRESIÓN ── */
    @media print {
      body         { background: #fff; padding: 0; }
      .print-btn   { display: none !important; }
      .factura-wrapper { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>

  <div class="factura-wrapper">

    <!-- CABECERA DE LA FACTURA -->
    <div class="factura-header">
      <div class="logo-area">
        <h1>💜 Portal de Pagos</h1>
        <p>Comprobante de facturación</p>
      </div>
      <div class="num-area">
        <div class="num-label">Factura N°</div>
        <div class="num-value">${String(factura.id).padStart(4, '0')}</div>
      </div>
    </div>

    <!-- INFO: CLIENTE, PROVEEDOR Y PERÍODO -->
    <div class="factura-info">

      <!-- BLOQUE 1: DATOS DEL CLIENTE -->
      <div class="info-block">
        <div class="block-label">Facturado a</div>
        <div class="block-value">${nombreCliente}</div>
        <div class="block-sub">
          ${cuit         ? `CUIT: ${cuit}<br/>`       : ''}
          ${emailCliente ? `${emailCliente}<br/>`      : ''}
          ${direccion    ? direccion                   : ''}
        </div>
      </div>

      <!-- BLOQUE 2: DATOS DEL PROVEEDOR (PERFIL ADMIN) -->
      <div class="info-block info-block--proveedor">
        <div class="block-label">Proveedor</div>
        <div class="block-value">${config.razon_social || 'Portal de Pagos'}</div>
        <div class="block-sub">
          ${config.rubro     ? `${config.rubro}<br/>`           : ''}
          ${config.cuit      ? `CUIT: ${config.cuit}<br/>`      : ''}
          ${config.telefono  ? `Tel: ${config.telefono}<br/>`   : ''}
          ${config.direccion ? config.direccion                  : ''}
        </div>
      </div>

      <!-- BLOQUE 3: PERÍODO Y ESTADO -->
      <div class="info-block">
        <div class="block-label">Período</div>
        <div class="block-value">${periodoLabel}</div>
        <div class="block-sub">Emitida el ${fechaCreacion}</div>
        <span class="estado-badge ${factura.estado}">
          ${factura.estado === 'pagado' ? '✅ Pagado' : '🕐 Pendiente'}
        </span>
      </div>

    </div>

    <!-- DETALLE DE SERVICIOS -->
    <div class="factura-table-wrapper">
      <h3>Detalle de servicios</h3>
      <table class="factura-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th style="text-align:center">Cant.</th>
            <th style="text-align:right">Precio unit.</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${filasDetalle}
        </tbody>
      </table>
    </div>

    <!-- TOTAL -->
    <div class="factura-total">
      <div class="total-box">
        <div class="total-label">Total del período</div>
        <div class="total-value">${fmt(factura.total)}</div>
      </div>
    </div>

    <!-- PIE -->
    <div class="factura-footer">
      <span>Portal de Pagos · Sistema de Facturación</span>
      <span>Factura #${String(factura.id).padStart(4, '0')} · ${periodoLabel}</span>
    </div>

  </div>

</body>
</html>`;

  return html;
}

// 4 - EXPORTO EL GENERADOR:
module.exports = { generarHTMLFacturaString };

