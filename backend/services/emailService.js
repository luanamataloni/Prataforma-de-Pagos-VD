// ============================================================
// SERVICIO DE ENVÍO DE MAILS - NODEMAILER
// ============================================================

// 1 - CARGO LAS VARIABLES DE ENTORNO DESDE .env:
require('dotenv').config();

// 2 - IMPORTO NODEMAILER Y PUPPETEER:
const nodemailer = require('nodemailer');
const puppeteer  = require('puppeteer');

// 2b - IMPORTO EL GENERADOR DE HTML COMPARTIDO (mismo que muestra el portal web):
const { generarHTMLFacturaString } = require('./facturaHtmlService');

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

// ── HELPER: GENERA EL PDF DE LA FACTURA USANDO EL MISMO HTML DEL PORTAL ──
// Usa puppeteer para renderizar el HTML idéntico al que ve el cliente en el portal web.
// Así el PDF adjunto al mail es 100% igual al que descarga desde la web.
async function crearPdfFacturaBuffer({ cliente, factura, detalle, config }) {

  // 1 - ARMO EL OBJETO factura CON LOS DATOS DEL CLIENTE (campos que espera el HTML):
  const facturaConCliente = {
    ...factura,
    razon_social:        cliente.razon_social  || '',
    client_nombre:       cliente.razon_social  || '',
    cliente_cuit:        cliente.cuit          || '',
    cliente_email:       cliente.email         || '',
    cliente_direccion:   cliente.direccion     || '',
  };

  // 2 - GENERO EL HTML CON EL SERVICIO COMPARTIDO (el mismo que muestra el portal):
  const html = generarHTMLFacturaString({ factura: facturaConCliente, detalle, config });

  // 3 - ABRO UN NAVEGADOR HEADLESS CON PUPPETEER:
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // 4 - ABRO UNA PÁGINA Y CARGO EL HTML:
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  // 5 - GENERO EL PDF EN MEMORIA (formato A4, sin márgenes extra):
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' }
  });

  // 6 - CIERRO EL NAVEGADOR Y DEVUELVO EL PDF:
  await browser.close();
  return pdfBuffer;
}

// 3 - CREO EL TRANSPORTER DE NODEMAILER CON LA CONFIG DEL .env:
function crearTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// 4 - GENERO EL CUERPO HTML DEL MAIL DE NUEVA FACTURA:
function generarHTMLMail({ cliente, factura, detalle, config, periodoLabel, nroFactura }) {

  // 4a - GENERO LAS FILAS DE SERVICIOS:
  const filasServicios = detalle.map(item => `
    <tr>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB; font-size:0.9rem; color:#374151;">
        ${item.descripcion}
      </td>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB; text-align:center; font-size:0.9rem; color:#374151;">
        ${item.cantidad}
      </td>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB; text-align:right; font-size:0.9rem; color:#374151;">
        ${fmt(item.importe)}
      </td>
      <td style="padding:10px 16px; border-bottom:1px solid #E5E7EB; text-align:right; font-weight:700; color:#7C3AED; font-size:0.9rem;">
        ${fmt(item.importe * item.cantidad)}
      </td>
    </tr>
  `).join('');

  // 4b - NOMBRE DEL PROVEEDOR (del perfil admin):
  const nombreProveedor = config.razon_social || 'Portal de Pagos';

  // 4c - RETORNO EL HTML COMPLETO DEL MAIL:
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Nueva factura - ${periodoLabel}</title>
</head>
<body style="margin:0; padding:0; background:#F4F4F8; font-family:'Segoe UI', Arial, sans-serif;">

  <!-- CONTENEDOR PRINCIPAL -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F8; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff; border-radius:16px; overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08); max-width:600px; width:100%;">

          <!-- CABECERA CON COLOR VIOLETA -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%);
                       padding:36px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:#fff; font-size:1.5rem; font-weight:800; letter-spacing:-0.02em;">
                       ${nombreProveedor}
                    </div>
                    <div style="color:rgba(255,255,255,0.8); font-size:0.85rem; margin-top:4px;">
                      Nueva factura emitida
                    </div>
                  </td>
                  <td align="right">
                    <div style="color:rgba(255,255,255,0.75); font-size:0.7rem;
                                font-weight:600; text-transform:uppercase; letter-spacing:0.08em;">
                      Factura N°
                    </div>
                    <div style="color:#fff; font-size:2rem; font-weight:800; line-height:1; margin-top:4px;">
                      ${nroFactura}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MENSAJE DE SALUDO -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0; font-size:1rem; color:#1A1A2E; font-weight:500;">
                Hola <strong>${cliente.razon_social}</strong>,
              </p>
              <p style="margin:10px 0 0; font-size:0.9rem; color:#6B7280; line-height:1.6;">
                Te informamos que se ha emitido una nueva factura correspondiente al período
                <strong style="color:#7C3AED;">${periodoLabel}</strong>.
                A continuación encontrás el detalle:
              </p>
            </td>
          </tr>

          <!-- DATOS DEL PERÍODO -->
          <tr>
            <td style="padding:20px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="background:#F4F4F8; border-radius:10px; overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px; border-right:1px solid #E5E7EB;">
                    <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase;
                                letter-spacing:0.07em; color:#9CA3AF; margin-bottom:4px;">
                      Período
                    </div>
                    <div style="font-size:1rem; font-weight:700; color:#1A1A2E;">
                      ${periodoLabel}
                    </div>
                  </td>
                  <td style="padding:16px 20px; border-right:1px solid #E5E7EB;">
                    <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase;
                                letter-spacing:0.07em; color:#9CA3AF; margin-bottom:4px;">
                      Cliente
                    </div>
                    <div style="font-size:1rem; font-weight:700; color:#1A1A2E;">
                      ${cliente.razon_social}
                    </div>
                    ${cliente.cuit ? `<div style="font-size:0.78rem; color:#6B7280;">CUIT: ${cliente.cuit}</div>` : ''}
                  </td>
                  <td style="padding:16px 20px;">
                    <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase;
                                letter-spacing:0.07em; color:#9CA3AF; margin-bottom:4px;">
                      Estado
                    </div>
                    <div style="display:inline-block; background:#EFF6FF; color:#3B82F6;
                                border-radius:9999px; padding:4px 12px;
                                font-size:0.78rem; font-weight:700;">
                      🕐 Pendiente de pago
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- TABLA DE SERVICIOS -->
          <tr>
            <td style="padding:0 40px 16px;">
              <div style="font-size:0.65rem; font-weight:700; text-transform:uppercase;
                          letter-spacing:0.07em; color:#9CA3AF; margin-bottom:12px;">
                Detalle de servicios
              </div>
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse; font-size:0.875rem;">
                <!-- ENCABEZADOS DE COLUMNA -->
                <thead>
                  <tr style="background:#F4F4F8;">
                    <th style="padding:10px 16px; font-size:0.65rem; font-weight:700;
                               text-transform:uppercase; letter-spacing:0.05em; color:#9CA3AF;
                               text-align:left; border-bottom:1px solid #E5E7EB;">
                      Descripción
                    </th>
                    <th style="padding:10px 16px; font-size:0.65rem; font-weight:700;
                               text-transform:uppercase; letter-spacing:0.05em; color:#9CA3AF;
                               text-align:center; border-bottom:1px solid #E5E7EB;">
                      Cant.
                    </th>
                    <th style="padding:10px 16px; font-size:0.65rem; font-weight:700;
                               text-transform:uppercase; letter-spacing:0.05em; color:#9CA3AF;
                               text-align:right; border-bottom:1px solid #E5E7EB;">
                      Precio
                    </th>
                    <th style="padding:10px 16px; font-size:0.65rem; font-weight:700;
                               text-transform:uppercase; letter-spacing:0.05em; color:#9CA3AF;
                               text-align:right; border-bottom:1px solid #E5E7EB;">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  ${filasServicios}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- TOTAL -->
          <tr>
            <td style="padding:16px 40px 32px; border-top:2px solid #EDE9FE; background:#FAFAFA;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td></td>
                  <td align="right">
                    <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase;
                                letter-spacing:0.06em; color:#9CA3AF; margin-bottom:6px;">
                      Total del período
                    </div>
                    <div style="font-size:2rem; font-weight:800; color:#7C3AED; line-height:1;">
                      ${fmt(factura.total)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- INSTRUCCIONES DE PAGO -->
          <tr>
            <td style="padding:20px 40px; border-top:1px solid #E5E7EB;">
              <div style="background:#EDE9FE; border-radius:10px; padding:16px 20px;">
                <p style="margin:0; font-size:0.85rem; color:#5B21B6; font-weight:600;">
                  📋 ¿Cómo pagar?
                </p>
                <p style="margin:8px 0 0; font-size:0.82rem; color:#6B7280; line-height:1.6;">
                  1. Ingresá al portal con tu usuario y contraseña.<br/>
                  2. En tu panel, buscá la factura del período <strong>${periodoLabel}</strong>.<br/>
                  3. Adjuntá el comprobante de pago y envialo.<br/>
                  4. El administrador confirmará tu pago.
                </p>
                <p style="margin:10px 0 0; font-size:0.82rem; color:#6B7280; line-height:1.6;">
                  También te adjuntamos una copia en PDF para que puedas descargarla directamente desde este correo.
                </p>
              </div>
            </td>
          </tr>

          <!-- PIE DEL MAIL -->
          <tr>
            <td style="padding:20px 40px; border-top:1px solid #E5E7EB;">
              <p style="margin:0; font-size:0.75rem; color:#9CA3AF; text-align:center;">
                ${nombreProveedor} · Sistema de Facturación
                ${config.telefono ? `· Tel: ${config.telefono}` : ''}
                ${config.direccion ? `<br/>${config.direccion}` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// ============================================================
// 5 - FUNCIÓN PRINCIPAL: ENVÍA EL MAIL DE NUEVA FACTURA AL CLIENTE
// ============================================================
async function enviarMailNuevaFactura({ cliente, factura, detalle, config }) {
  try {

    // 5a - VERIFICO QUE EL CLIENTE TENGA EMAIL REGISTRADO:
    if (!cliente.email) {
      console.warn(`[EMAIL] Cliente "${cliente.razon_social}" no tiene email registrado. Se omite el envío.`);
      return { enviado: false, razon: 'Sin email registrado' };
    }

    // 5b - VERIFICO QUE LAS CREDENCIALES SMTP ESTÉN CONFIGURADAS:
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[EMAIL] SMTP_USER o SMTP_PASS no configurados en .env. Se omite el envío.');
      return { enviado: false, razon: 'SMTP no configurado' };
    }

    // 5c - FORMATEO EL NÚMERO DE FACTURA Y EL PERÍODO:
    const nroFactura   = String(factura.id).padStart(4, '0');
    const periodoLabel = fmtPeriodo(factura.periodo);

    // 5d - GENERO EL CUERPO HTML DEL MAIL:
    const htmlMail = generarHTMLMail({ cliente, factura, detalle, config, periodoLabel, nroFactura });

    // 5d-1 - GENERO EL PDF PARA ADJUNTARLO AL CORREO:
    const pdfBuffer = await crearPdfFacturaBuffer({ cliente, factura, detalle, config });

    // 5e - CREO EL TRANSPORTER Y ENVÍO EL MAIL:
    // Usa mail_envio de la DB si está configurado, sino cae al .env:
    const fromAddress = config.mail_envio || process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
    const fromName    = process.env.MAIL_FROM_NAME || config.razon_social || 'Portal de Pagos';
    const transporter = crearTransporter();
    const info = await transporter.sendMail({
      from:    `"${fromName}" <${fromAddress}>`,
      to:      cliente.email,
      subject: `Nueva factura ${periodoLabel} - ${config.razon_social || 'Portal de Pagos'}`,
      html:    htmlMail,
      attachments: [{
        filename: `factura_${nroFactura}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }],
    });

    console.log(`[EMAIL] ✅ Mail enviado a ${cliente.email} (factura #${nroFactura}) - ID: ${info.messageId}`);
    return { enviado: true, messageId: info.messageId };

  } catch (error) {
    // 5f - SI FALLA EL ENVÍO, SOLO LOGUEO EL ERROR (NO ROMPO LA GENERACIÓN DE FACTURAS):
    console.error(`[EMAIL] ❌ Error al enviar mail a ${cliente.email}:`, error.message);
    return { enviado: false, razon: error.message };
  }
}

// ============================================================
// 6 - FUNCIÓN: ENVÍA EL MAIL MANUAL DE FACTURA DESDE EL PANEL ADMIN
// ============================================================
// Este mail se envía cuando el admin hace clic en "Enviar mail" desde la lista de facturas.
// Usa el email del campo "email" del cliente en la tabla clientes (NO el email de portal).

async function enviarMailFacturaManual({ cliente, factura, detalle, config }) {
  try {

    // 6a - VERIFICO QUE EL CLIENTE TENGA EMAIL REGISTRADO EN SUS DATOS:
    if (!cliente.email) {
      console.warn(`[EMAIL] Cliente "${cliente.razon_social}" no tiene email registrado. Se omite el envío.`);
      return { enviado: false, razon: 'Sin email registrado' };
    }

    // 6b - VERIFICO QUE LAS CREDENCIALES SMTP ESTÉN CONFIGURADAS:
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[EMAIL] SMTP_USER o SMTP_PASS no configurados en .env. Se omite el envío.');
      return { enviado: false, razon: 'SMTP no configurado' };
    }

    // 6c - ARMO LOS DATOS DEL MAIL:
    const nroFactura    = String(factura.id).padStart(4, '0');
    const periodoLabel  = fmtPeriodo(factura.periodo);
    const nombreEmpresa = config.razon_social || 'Portal de Pagos';
    const cbu           = process.env.PAGO_CBU   || '(consultar al administrador)';
    const portalUrl     = process.env.PORTAL_URL  || 'el portal';

    // 6d - PRE-GENERO EL HTML DE CADA SERVICIO (evita template literals anidadas):
    const filasServiciosManual = detalle.map(function(item) {
      return '<div style="display:flex; justify-content:space-between; align-items:center; gap:16px;' +
             'padding:5px 0; font-size:0.88rem; color:#374151;">' +
             '<span style="flex:1; padding-right:12px;">• ' + item.descripcion + '</span>' +
             '<span style="font-weight:700; color:#7C3AED; white-space:nowrap;">' + fmt(item.importe * item.cantidad) + '</span>' +
             '</div>';
    }).join('');

    // 6e - GENERO EL CUERPO HTML DEL MAIL CON EL FORMATO SOLICITADO:
    const htmlMail = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Factura ${periodoLabel}</title>
</head>
<body style="margin:0; padding:0; background:#F4F4F8; font-family:'Segoe UI', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F8; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#ffffff; border-radius:16px; overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08); max-width:600px; width:100%;">

          <!-- CABECERA VIOLETA -->
          <tr>
            <td style="background:linear-gradient(135deg,#7C3AED 0%,#5B21B6 100%); padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:#fff; font-size:1.4rem; font-weight:800;">
                       ${nombreEmpresa}
                    </div>
                    <div style="color:rgba(255,255,255,0.75); font-size:0.82rem; margin-top:4px;">
                      Comprobante de facturación · Factura N° ${nroFactura}
                    </div>
                  </td>
                  <td align="right">
                    <div style="color:rgba(255,255,255,0.75); font-size:0.65rem; text-transform:uppercase; letter-spacing:0.08em;">Período</div>
                    <div style="color:#fff; font-size:1.3rem; font-weight:800; margin-top:2px;">${periodoLabel}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CUERPO DEL MAIL -->
          <tr>
            <td style="padding:32px 40px;">

              <!-- SALUDO -->
              <p style="margin:0 0 20px; font-size:0.98rem; color:#1A1A2E;">
                Buenos días, <strong>${cliente.razon_social}</strong>.
              </p>

              <!-- TEXTO PRINCIPAL -->
              <p style="margin:0 0 16px; font-size:0.9rem; color:#374151; line-height:1.7;">
                Adjuntamos su nueva factura correspondiente al período
                <strong style="color:#7C3AED;">${periodoLabel}</strong>.
              </p>
              <p style="margin:0 0 8px; font-size:0.9rem; color:#374151; line-height:1.7;">
                La misma incluye los siguientes servicios:
              </p>

              <!-- LISTA DE SERVICIOS -->
              <div style="background:#F4F4F8; border-left:3px solid #7C3AED;
                          border-radius:0 8px 8px 0; padding:14px 20px; margin:0 0 24px;">
                ${filasServiciosManual}
                <div style="border-top:1px solid #E5E7EB; margin-top:10px; padding-top:10px;
                            display:flex; justify-content:space-between; align-items:center; gap:16px;
                            font-weight:800; font-size:1rem; color:#1A1A2E;">
                  <span style="padding-right:12px;">Total</span>
                  <span style="color:#7C3AED; white-space:nowrap;">${fmt(factura.total)}</span>
                </div>
              </div>

              <!-- INSTRUCCIONES DE PAGO -->
              <div style="background:#EDE9FE; border-radius:10px; padding:20px 24px; margin-bottom:24px;">
                <p style="margin:0 0 12px; font-size:0.92rem; font-weight:700; color:#5B21B6;">
                  📋 Cómo abonar:
                </p>
                <ol style="margin:0; padding-left:20px; font-size:0.87rem; color:#374151; line-height:2;">
                  <li>Ingresar a <strong>Mercado Pago</strong>.</li>
                  <li>Depositar el monto total al siguiente CBU:<br/>
                    <code style="background:#fff; border-radius:6px; padding:4px 10px;
                                 font-size:0.92rem; font-weight:700; color:#7C3AED;
                                 letter-spacing:0.05em; display:inline-block; margin-top:4px;">
                      ${cbu}
                    </code>
                  </li>
                  <li>Adjuntar el comprobante de pago en:<br/>
                    <a href="https://${portalUrl}" style="color:#7C3AED; font-weight:600;">
                      ${portalUrl}
                    </a>
                  </li>
                </ol>
                <p style="margin:12px 0 0; font-size:0.82rem; color:#6B7280; line-height:1.6;">
                  Le notificaremos la correcta recepción vía correo electrónico.<br/>
                  También podrá visualizar el detalle del pago en la factura correspondiente.
                </p>
              </div>

              <!-- CIERRE -->
              <p style="margin:0 0 6px; font-size:0.88rem; color:#6B7280; line-height:1.7;">
                Ante cualquier duda o consulta, quedamos a disposición.
              </p>
              <p style="margin:0 0 8px; font-size:0.88rem; color:#6B7280; line-height:1.7;">
                También te adjuntamos esta factura en formato PDF para que puedas descargarla directamente desde este correo.
              </p>
              <p style="margin:0; font-size:0.88rem; color:#1A1A2E; font-weight:600;">
                Saludos cordiales,<br/>
                <span style="color:#7C3AED;">${nombreEmpresa}</span>
              </p>

            </td>
          </tr>

          <!-- PIE -->
          <tr>
            <td style="padding:16px 40px; border-top:1px solid #E5E7EB; background:#FAFAFA;">
              <p style="margin:0; font-size:0.72rem; color:#9CA3AF; text-align:center;">
                ${nombreEmpresa} · Sistema de Facturación
                ${config.telefono ? `· Tel: ${config.telefono}` : ''}
                ${config.direccion ? `<br/>${config.direccion}` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `;

    // 6f - CREO EL TRANSPORTER Y ENVÍO EL MAIL:
    // Usa mail_envio de la DB si está configurado, sino cae al .env:
    const fromAddress = config.mail_envio || process.env.MAIL_FROM_ADDRESS || process.env.SMTP_USER;
    const fromName    = process.env.MAIL_FROM_NAME || nombreEmpresa;
    const pdfBuffer   = await crearPdfFacturaBuffer({ cliente, factura, detalle, config });
    const transporter = crearTransporter();
    const info = await transporter.sendMail({
      from:    `"${fromName}" <${fromAddress}>`,
      to:      cliente.email,
      subject: `Nueva factura ${periodoLabel} - Factura N° ${nroFactura}`,
      html:    htmlMail,
      attachments: [{
        filename: `factura_${nroFactura}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }],
    });

    console.log(`[EMAIL] ✅ Mail manual enviado a ${cliente.email} (factura #${nroFactura}) - ID: ${info.messageId}`);
    return { enviado: true, messageId: info.messageId };

  } catch (error) {
    // 6g - SI FALLA EL ENVÍO, LOGUEO EL ERROR Y LO PROPAGO:
    console.error(`[EMAIL] ❌ Error al enviar mail manual a ${cliente.email}:`, error.message);
    return { enviado: false, razon: error.message };
  }
}

// 7 - EXPORTO LAS FUNCIONES:
module.exports = { enviarMailNuevaFactura, enviarMailFacturaManual, crearPdfFacturaBuffer };




