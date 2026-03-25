/** Prescribed lines for pharmacy / confirm: array first, else SOAP plan text. */
function medicinesForVisit(visit) {
  const rx = visit?.prescription;
  if (Array.isArray(rx) && rx.length > 0) {
    return rx.map((m) => (typeof m === 'string' ? m : m?.name || String(m))).filter(Boolean);
  }
  const plan = visit?.soapNote?.plan;
  if (plan && String(plan).trim()) {
    return [String(plan).trim()];
  }
  return [];
}

module.exports = { medicinesForVisit };
