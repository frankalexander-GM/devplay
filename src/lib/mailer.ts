/**
 * DevPlay Mailer 📬
 * Envío de correos reales (recuperación de contraseña, códigos de seguridad,
 * bienvenida) vía SMTP. Funciona con Gmail (app password), Outlook, Zoho,
 * Resend SMTP o el SMTP integrado de Supabase.
 *
 * Configuración en .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=465
 *   SMTP_USER=tucorreo@gmail.com
 *   SMTP_PASS=tu-app-password
 *   MAIL_FROM="DevPlay <no-reply@devplay.app>"
 *
 * ⚠️ Sin SMTP configurado → los enlaces/códigos se registran en el log del
 * servidor y se devuelven como devToken/devCode (modo demo), igual que antes.
 */

import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 465)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const MAIL_FROM = process.env.MAIL_FROM || `DevPlay <${SMTP_USER || 'no-reply@devplay.app'}>`

export function mailEnabled(): boolean {
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS)
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransport(): ReturnType<typeof nodemailer.createTransport> {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // 465 = SSL implícito; 587 usa STARTTLS
      auth: { user: SMTP_USER!, pass: SMTP_PASS! },
      // Gmail conecta en <1s; con estos topes, si el correo no responde
      // la web no se queda colgada esperando (máx ~10s y sigue).
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    })
  }
  return transporter
}

export async function sendMail(opts: { to: string; subject: string; html: string; text?: string }) {
  if (!mailEnabled()) {
    console.log(`[mailer·demo] SMTP no configurado. Correo NO enviado a ${opts.to} — asunto: "${opts.subject}"`)
    return false
  }
  try {
    await getTransport().sendMail({
      from: MAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      html: opts.html,
    })
    console.log(`[mailer] Correo enviado a ${opts.to} — "${opts.subject}"`)
    return true
  } catch (e) {
    console.error('[mailer] Error enviando correo:', e)
    return false
  }
}

/* ============================================================
   Plantillas — estética retro Terracota & Crema de DevPlay 🧡
   (tablas simples, compatibles con Gmail/Outlook)
   ============================================================ */

const CREAM = '#FBF3E4'
const INK = '#4A2E21'
const TERRA = '#C66E41'
const TERRA_DARK = '#A9552F'
const OLIVE = '#7A8B4C'

function shell(title: string, bodyHtml: string, footerNote: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:0;background:#EFE3CC;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFE3CC;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <!-- Cabecera con logo textual -->
          <tr>
            <td style="text-align:center;padding:8px 0 18px 0;">
              <span style="display:inline-block;background:${TERRA};color:${CREAM};font-size:22px;font-weight:bold;letter-spacing:2px;padding:10px 26px;border-radius:10px;border:3px solid ${INK};">
                🤖 DevPlay
              </span>
            </td>
          </tr>
          <!-- Tarjeta principal -->
          <tr>
            <td style="background:${CREAM};border:3px solid ${INK};border-radius:14px;padding:32px 30px;box-shadow:4px 4px 0 rgba(74,46,33,0.25);">
              <h1 style="margin:0 0 6px 0;color:${INK};font-size:22px;">${title}</h1>
              <div style="height:3px;background:repeating-linear-gradient(90deg,${TERRA} 0 10px,transparent 10px 16px);margin:14px 0 18px 0;border-radius:2px;"></div>
              ${bodyHtml}
            </td>
          </tr>
          <!-- Pie -->
          <tr>
            <td style="text-align:center;padding:16px 10px 0 10px;color:#8A7357;font-size:12px;line-height:1.6;">
              ${footerNote}
              <br/>© DevPlay — la plaza retro de los devs indie 🎮
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function bigCode(code: string): string {
  return `
  <p style="margin:0 0 14px 0;color:${INK};font-size:15px;line-height:1.6;">Tu código es:</p>
  <div style="text-align:center;margin:0 0 18px 0;">
    <span style="display:inline-block;background:#FFF9EE;border:3px dashed ${TERRA};color:${TERRA_DARK};font-size:34px;font-weight:bold;letter-spacing:10px;padding:14px 26px;border-radius:12px;font-family:'Courier New',monospace;">
      ${code}
    </span>
  </div>
  <p style="margin:0;color:${INK};font-size:13px;line-height:1.6;">⏳ Caduca en <b>10 minutos</b>. Si no fuiste tú, ignora este correo y cambia tu contraseña por si acaso.</p>`
}

function button(url: string, label: string): string {
  return `
  <div style="text-align:center;margin:22px 0 8px 0;">
    <a href="${url}" style="display:inline-block;background:${TERRA};background:linear-gradient(135deg,${TERRA},${TERRA_DARK});color:#FFF6E8;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 34px;border-radius:999px;border:2px solid ${INK};">
      ${label}
    </a>
  </div>
  <p style="margin:14px 0 0 0;color:${INK};font-size:12px;line-height:1.6;word-break:break-all;">
    Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
    <a href="${url}" style="color:${TERRA_DARK};">${url}</a>
  </p>`
}

/* ===== Correos concretos ===== */

export function resetPasswordEmail(username: string, resetUrl: string) {
  return {
    subject: 'Recupera tu contraseña · DevPlay 🔑',
    html: shell(
      `¡Hola, ${username}!`,
      `<p style="margin:0 0 10px 0;color:${INK};font-size:15px;line-height:1.7;">
        Nos dijiste que olvidaste tu contraseña. Pasa nada, pasa hasta en las mejores familias de devs 😄
      </p>
      <p style="margin:0 0 6px 0;color:${INK};font-size:15px;line-height:1.7;">
        Toca el botón para crear una nueva. El enlace caduca en <b>1 hora</b>.
      </p>
      ${button(resetUrl, 'Crear nueva contraseña')}
      <p style="margin:16px 0 0 0;color:${OLIVE};font-size:13px;line-height:1.6;">
        🔒 Si <b>no</b> pediste este cambio, ignora este correo: tu cuenta sigue segura.
      </p>`,
      'Este correo se envió porque alguien solicitó recuperar la contraseña de tu cuenta.'
    ),
  }
}

export function deletionCodeEmail(username: string, code: string) {
  return {
    subject: 'Código de seguridad · DevPlay 🛡️',
    html: shell(
      `Último paso, ${username}`,
      `<p style="margin:0 0 14px 0;color:${INK};font-size:15px;line-height:1.7;">
        Pediste eliminar tu cuenta de DevPlay (¡vaaayo, te vamos a extrañar! 💔).
        Para confirmar que eres tú, escribe este código en la app:
      </p>
      ${bigCode(code)}`,
      'Si no fuiste tú quien pidió este código, alguien podría estar intentando entrar a tu cuenta: cambia tu contraseña cuanto antes.'
    ),
  }
}

export function verificationCodeEmail(username: string, code: string, purpose: string) {
  return {
    subject: `Tu código de verificación · DevPlay ✉️`,
    html: shell(
      `¡Hola, ${username}!`,
      `<p style="margin:0 0 14px 0;color:${INK};font-size:15px;line-height:1.7;">
        Usá este código para <b>${purpose}</b>:
      </p>
      ${bigCode(code)}`,
      'Nunca te pediremos este código por chat ni por llamada. Solo se ingresa dentro de DevPlay.'
    ),
  }
}

export function welcomeEmail(username: string) {
  return {
    subject: '¡Bienvenido a DevPlay! 🎮🤖',
    html: shell(
      `¡Llegaste, ${username}! 🎉`,
      `<p style="margin:0 0 12px 0;color:${INK};font-size:15px;line-height:1.7;">
        Ya eres parte de la plaza retro donde la comunidad indie publica sus juegos, betas, videos y devlogs.
      </p>
      <p style="margin:0 0 12px 0;color:${INK};font-size:15px;line-height:1.7;">
        Unos tips rápidos para empezar con buen pie:
      </p>
      <ul style="margin:0 0 14px 0;padding-left:20px;color:${INK};font-size:14px;line-height:1.9;">
        <li>🎮 Sube tu beta y que la comunidad te dé feedback</li>
        <li>💬 Saludita en el Chat Mundial (nadie ve quién está conectado, solo los mensajes)</li>
        <li>🤖 Pregúntale lo que quieras a Pixel, el asistente de la esquina</li>
      </ul>
      <p style="margin:0;color:${OLIVE};font-size:14px;line-height:1.6;">
        Ahora sí... ¡a crear! ☕✨
      </p>`,
      'Recibes este correo porque creaste una cuenta en DevPlay.'
    ),
  }
}
