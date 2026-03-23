const twilio = require('twilio');

async function sendWhatsApp(toPhone, message) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const formatted = toPhone.startsWith('+') ? toPhone : '+91' + toPhone;
  await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: 'whatsapp:' + formatted,
    body: message,
  });
}

module.exports = { sendWhatsApp };
