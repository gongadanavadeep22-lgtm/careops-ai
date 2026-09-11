function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** Normalize India-friendly numbers to a comparable digit string (10-digit local or E.164 without +). */
function normalizePhoneDigits(phone) {
  let d = digitsOnly(phone);
  if (d.startsWith('91') && d.length === 12) d = d.slice(2);
  return d;
}

function isValidPatientPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return { ok: false, error: 'Phone number is required' };
  const d = digitsOnly(raw);
  if (d.length === 10) return { ok: true, normalized: d };
  if (d.length === 12 && d.startsWith('91')) return { ok: true, normalized: d.slice(2) };
  if (raw.startsWith('+') && d.length >= 10 && d.length <= 15) return { ok: true, normalized: d };
  return {
    ok: false,
    error: 'Enter a valid phone (10-digit India mobile or +country code).',
  };
}

module.exports = { digitsOnly, normalizePhoneDigits, isValidPatientPhone };
