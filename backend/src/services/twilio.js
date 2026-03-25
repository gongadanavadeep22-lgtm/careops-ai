const twilio = require('twilio');

/**
 * Railway env (all required for WhatsApp):
 * - TWILIO_ACCOUNT_SID   (starts with AC...)
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_FROM  e.g. whatsapp:+14155238886 (sandbox) — must be WhatsApp-enabled sender
 *
 * Sandbox: patient must text your join code to the sandbox number before they receive messages.
 */
function normalizeWhatsAppFrom(raw) {
  const s = (raw || '').trim().replace(/['"]/g, '');
  if (!s) return '';
  if (/^whatsapp:/i.test(s)) return s;
  const num = s.startsWith('+') ? s : `+${s.replace(/\D/g, '')}`;
  return `whatsapp:${num}`;
}

function normalizeWhatsAppTo(toPhone) {
  let s = String(toPhone || '').trim().replace(/\s/g, '');
  if (!s) throw new Error('Patient phone is empty');
  if (/^whatsapp:/i.test(s)) s = s.replace(/^whatsapp:/i, '');
  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    if (!digits) throw new Error('Patient phone has no digits');
    return `whatsapp:+${digits}`;
  }
  const digits = s.replace(/\D/g, '');
  if (!digits) throw new Error('Patient phone has no digits');
  // 10-digit numbers treated as India; otherwise add + prefix (e.g. 91xxxxxxxxxx)
  if (digits.length === 10) {
    return `whatsapp:+91${digits}`;
  }
  return `whatsapp:+${digits}`;
}

async function sendWhatsApp(toPhone, message) {
  const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const from = normalizeWhatsAppFrom(process.env.TWILIO_WHATSAPP_FROM);

  if (!sid || !token) {
    throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing');
  }
  if (!from) {
    throw new Error('TWILIO_WHATSAPP_FROM missing (use e.g. whatsapp:+14155238886)');
  }

  const client = twilio(sid, token);
  const to = normalizeWhatsAppTo(toPhone);

  await client.messages.create({
    from,
    to,
    body: message,
  });
}

module.exports = { sendWhatsApp };
