const twilio = require('twilio');
const { agentDebug } = require('../utils/agentDebug');

const _sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
const _token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
if (!_sid || !_token) {
  console.error('[Twilio] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing at startup');
}

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
    // #region agent log
    agentDebug({
      location: 'twilio.js:sendWhatsApp',
      message: 'missing_credentials',
      data: { hasSid: !!sid, hasToken: !!token, hasFrom: !!from },
      hypothesisId: 'H1',
    });
    // #endregion
    throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing');
  }
  if (!from) {
    // #region agent log
    agentDebug({
      location: 'twilio.js:sendWhatsApp',
      message: 'missing_whatsapp_from',
      data: { hasFrom: false },
      hypothesisId: 'H1',
    });
    // #endregion
    throw new Error('TWILIO_WHATSAPP_FROM missing (use e.g. whatsapp:+14155238886)');
  }

  const client = twilio(sid, token);
  let to;
  try {
    to = normalizeWhatsAppTo(toPhone);
  } catch (normErr) {
    // #region agent log
    agentDebug({
      location: 'twilio.js:normalizeWhatsAppTo',
      message: 'normalize_failed',
      data: { err: String(normErr.message || normErr).slice(0, 120) },
      hypothesisId: 'H4',
    });
    // #endregion
    throw normErr;
  }
  // #region agent log
  agentDebug({
    location: 'twilio.js:sendWhatsApp',
    message: 'pre_create',
    data: {
      fromPrefix: String(from).slice(0, 18),
      toPrefix: String(to).slice(0, 18),
      bodyLen: String(message ?? '').length,
    },
    hypothesisId: 'H2',
  });
  // #endregion

  // Twilio rejects bodies over 1600 chars (e.g. error 21617); truncate to stay under the limit.
  const MAX_BODY = 1580;
  let body = String(message ?? '');
  if (body.length > MAX_BODY) {
    console.warn('[Twilio] Message length', body.length, 'exceeds limit; truncating to', MAX_BODY);
    body = `${body.slice(0, MAX_BODY - 24)}\n… (message truncated)`;
  }

  try {
    console.log('[Twilio] Sending WhatsApp (to suffix):', String(to).slice(-8), 'body chars:', body.length);
    const result = await client.messages.create({
      from,
      to,
      body,
    });
    console.log('[Twilio] WhatsApp sent. SID:', result.sid, 'status:', result.status);
    // #region agent log
    agentDebug({
      location: 'twilio.js:sendWhatsApp',
      message: 'twilio_ok',
      data: { sid: result.sid, status: result.status },
      hypothesisId: 'H2',
    });
    // #endregion
    return { success: true, sid: result.sid, status: result.status };
  } catch (error) {
    console.error('[Twilio] sendWhatsApp error full:', error);
    console.error('[Twilio] message:', error.message, 'code:', error.code);
    // #region agent log
    agentDebug({
      location: 'twilio.js:sendWhatsApp',
      message: 'twilio_api_error',
      data: {
        code: error.code != null ? String(error.code) : null,
        msg: String(error.message || '').slice(0, 200),
        status: error.status,
      },
      hypothesisId: 'H2',
    });
    // #endregion
    throw error;
  }
}

module.exports = { sendWhatsApp };
