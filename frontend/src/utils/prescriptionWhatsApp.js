function normalizeMedicineObject(raw) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const name = raw.trim();
    return name ? { name, recommendedDosage: '', frequency: '', usualDuration: '', notes: '' } : null;
  }
  if (typeof raw !== 'object') return null;
  const name = String(raw.name || raw.drug || raw.medicine || '').trim();
  if (!name) return null;
  return {
    name,
    recommendedDosage: String(
      raw.recommendedDosage || raw.dosage || raw.strength || raw.dose || ''
    ).trim(),
    frequency: String(raw.frequency || raw.timing || '').trim(),
    usualDuration: String(raw.usualDuration || raw.duration || '').trim(),
    notes: String(raw.notes || raw.instructions || raw.food || '').trim(),
  };
}

export function structuredMedicinesFromVisit(visit) {
  if (!visit || typeof visit !== 'object') return [];

  const selected = visit.selectedMedicines;
  if (Array.isArray(selected) && selected.length > 0) {
    return selected.map(normalizeMedicineObject).filter(Boolean);
  }

  const rx = visit.prescription;
  if (Array.isArray(rx) && rx.length > 0) {
    return rx.map(normalizeMedicineObject).filter(Boolean);
  }

  return [];
}

export function inferMedicineTimings(frequency, notes) {
  const f = String(frequency || '').toLowerCase();
  const n = String(notes || '').toLowerCase();
  const combined = `${f} ${n}`;

  if (/morning.*afternoon.*night|thrice|three times|3 times|tds/.test(combined)) {
    return 'Morning, Afternoon & Night';
  }
  if (/twice|two times|2 times|bd|bid/.test(combined)) {
    if (/morning.*evening/.test(combined)) return 'Morning & Evening';
    return 'Morning & Night';
  }
  if (/once daily|once a day|od|daily/.test(combined)) {
    if (/before breakfast|morning/.test(combined)) return 'Morning (before food)';
    if (/bedtime|night|evening/.test(combined)) return 'Night (after food)';
    return 'Morning (once daily)';
  }
  if (/morning/.test(combined) && /night/.test(combined)) return 'Morning & Night';
  if (/morning/.test(combined)) return 'Morning';
  if (/night|bedtime|evening/.test(combined)) return 'Night';
  if (frequency && String(frequency).trim()) return String(frequency).trim();
  return 'As directed by your doctor';
}

function formatFoodInstruction(notes, frequency) {
  const combined = `${notes || ''} ${frequency || ''}`.toLowerCase();
  if (/after food|after meal|with food/.test(combined)) return 'After food';
  if (/before food|empty stomach|before breakfast/.test(combined)) return 'Before food';
  return '';
}

export function formatStructuredMedicineLines(medicines) {
  const list = Array.isArray(medicines)
    ? medicines.map(normalizeMedicineObject).filter(Boolean)
    : [];

  if (list.length === 0) return ['• Your prescribed medicines'];

  return list.map((med, index) => {
    const timings = inferMedicineTimings(med.frequency, med.notes);
    const food = formatFoodInstruction(med.notes, med.frequency);
    const lines = [`*${index + 1}. ${med.name}*`];
    if (med.recommendedDosage) lines.push(`   • Dose: ${med.recommendedDosage}`);
    lines.push(`   • When: ${timings}`);
    if (food) lines.push(`   • Food: ${food}`);
    if (med.usualDuration) lines.push(`   • Duration: ${med.usualDuration}`);
    if (med.notes) lines.push(`   • Note: ${med.notes}`);
    return lines.join('\n');
  });
}

export function buildPharmacyPickupWhatsAppMessage({ patientName, visit, billLabel, payUrl }) {
  const label = (patientName && String(patientName).trim()) || 'there';
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const medicineBlock = formatStructuredMedicineLines(structuredMedicinesFromVisit(visit)).join(
    '\n\n'
  );
  const payLine = payUrl ? `💳 *Pay (demo):* ${payUrl}\n\n` : '';

  return (
    `🏥 *CareOps Hospital — Pharmacy*\n` +
    `📋 *Prescription ready* — ${today}\n\n` +
    `Hello ${label}!\n` +
    `Your prescribed medicines are ready for pickup. 🎉\n\n` +
    `💊 *Medicines & when to take:*\n\n` +
    `${medicineBlock}\n\n` +
    `💰 *Bill:* ${billLabel}\n` +
    `📍 *Collect from:* Counter 2\n` +
    payLine +
    `⚠️ Take only as prescribed. Return if symptoms worsen.\n\n` +
    `— CareOps AI`
  );
}
