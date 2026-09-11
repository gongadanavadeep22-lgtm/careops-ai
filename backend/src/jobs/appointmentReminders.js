/**
 * Appointment WhatsApp reminders — 60-minute fallback (Maps distance not wired yet).
 * Runs every minute when Twilio is configured.
 */
const { db } = require('../services/firestore');
const { sendWhatsApp } = require('../services/twilio');

const BUFFER_MS = 60 * 60 * 1000;
const WINDOW_MS = 2 * 60 * 1000;

function twilioReady() {
  return Boolean(
    (process.env.TWILIO_ACCOUNT_SID || '').trim() &&
      (process.env.TWILIO_AUTH_TOKEN || '').trim() &&
      (process.env.TWILIO_WHATSAPP_FROM || '').trim()
  );
}

async function tickReminders() {
  if (!twilioReady()) return;

  const now = Date.now();
  const snap = await db.collection('appointments').where('status', '==', 'booked').limit(100).get();

  for (const doc of snap.docs) {
    const appt = doc.data();
    if (appt.reminderSentAt) continue;
    const phone = String(appt.patientPhone || '').trim();
    if (!phone) continue;

    const scheduled = appt.scheduledAt?.toDate?.() || (appt.scheduledAt ? new Date(appt.scheduledAt) : null);
    if (!scheduled || Number.isNaN(scheduled.getTime())) continue;

    const dueAt = scheduled.getTime() - BUFFER_MS;
    if (now < dueAt || now > dueAt + WINDOW_MS) continue;

    const when = scheduled.toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' });
    const name = appt.patientName || 'there';
    const msg =
      `Hello ${name},\nReminder: your CareOps appointment is at ${when}` +
      (appt.doctorName ? ` with ${appt.doctorName}` : '') +
      `.\nPlease plan to arrive a few minutes early.\n— CareOps AI`;

    try {
      await sendWhatsApp(phone, msg);
      await doc.ref.update({ reminderSentAt: new Date(), reminderType: 'flat-60min' });
      console.log('[Reminders] sent for appointment', doc.id);
    } catch (err) {
      console.error('[Reminders] failed for', doc.id, err.message);
    }
  }
}

function startAppointmentReminders() {
  if (!twilioReady()) {
    console.log('[Reminders] skipped — Twilio not configured');
    return;
  }
  console.log('[Reminders] 60-min WhatsApp fallback job started');
  tickReminders().catch((e) => console.error('[Reminders]', e.message));
  setInterval(() => {
    tickReminders().catch((e) => console.error('[Reminders]', e.message));
  }, 60 * 1000);
}

module.exports = { startAppointmentReminders, tickReminders };
