const { MEDICATION_DISCLAIMER } = require('../data/diseaseCatalog');

/** Single public app URL for links in WhatsApp (not comma-separated CORS list). */
function patientFacingAppUrl() {
  const explicit = (process.env.FRONTEND_PUBLIC_URL || '').trim().replace(/['"]/g, '');
  if (explicit) return explicit.replace(/\/$/, '');
  const raw = (process.env.ALLOWED_ORIGIN || 'https://careops-ai-gamma.vercel.app').trim();
  const first = raw.split(',')[0].trim().replace(/['"]/g, '');
  const base = first || 'https://careops-ai-gamma.vercel.app';
  return base.replace(/\/$/, '');
}

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

function structuredMedicinesFromVisit(visit) {
  if (!visit || typeof visit !== 'object') return [];

  const selected = visit.selectedMedicines;
  if (Array.isArray(selected) && selected.length > 0) {
    return selected.map(normalizeMedicineObject).filter(Boolean);
  }

  const rx = visit.prescription;
  if (Array.isArray(rx) && rx.length > 0) {
    return rx.map(normalizeMedicineObject).filter(Boolean);
  }

  const plan = visit.soapNote?.plan;
  if (plan && String(plan).trim()) {
    return [{ name: String(plan).trim(), recommendedDosage: '', frequency: '', usualDuration: '', notes: '' }];
  }

  return [];
}

function structuredMedicinesToFlat(medicines) {
  if (!Array.isArray(medicines)) return [];
  return medicines
    .map((m) => {
      const obj = normalizeMedicineObject(m);
      if (!obj) return '';
      const parts = [obj.name, obj.recommendedDosage, obj.frequency, obj.usualDuration].filter(Boolean);
      return parts.join(' — ').trim();
    })
    .filter(Boolean);
}

/** Map frequency / notes to patient-friendly timing (Morning, Afternoon, Night). */
function inferMedicineTimings(frequency, notes) {
  const f = String(frequency || '').toLowerCase();
  const n = String(notes || '').toLowerCase();
  const combined = `${f} ${n}`;

  if (/morning.*afternoon.*night|thrice|three times|3 times|tds|q8h/.test(combined)) {
    return 'Morning, Afternoon & Night';
  }
  if (/four times|4 times|q6h/.test(combined)) {
    return 'Morning, Afternoon, Evening & Night';
  }
  if (/twice|two times|2 times|bd|bid/.test(combined)) {
    if (/morning.*evening|evening.*morning/.test(combined)) return 'Morning & Evening';
    if (/morning.*night|night.*morning/.test(combined)) return 'Morning & Night';
    return 'Morning & Night';
  }
  if (/once daily|once a day|od|daily|single dose/.test(combined)) {
    if (/before breakfast|morning|am\b/.test(combined)) return 'Morning (before food)';
    if (/bedtime|night|pm\b|evening/.test(combined)) return 'Night (after food)';
    if (/afternoon/.test(combined)) return 'Afternoon';
    return 'Morning (once daily)';
  }
  if (/morning/.test(combined) && /night/.test(combined)) return 'Morning & Night';
  if (/morning/.test(combined) && /afternoon/.test(combined)) return 'Morning & Afternoon';
  if (/morning/.test(combined)) return 'Morning';
  if (/afternoon/.test(combined)) return 'Afternoon';
  if (/night|bedtime|evening/.test(combined)) return 'Night';
  if (frequency && String(frequency).trim()) return String(frequency).trim();
  return 'As directed by your doctor';
}

function formatFoodInstruction(notes, frequency) {
  const combined = `${notes || ''} ${frequency || ''}`.toLowerCase();
  if (/after food|after meal|with food|with meals/.test(combined)) return 'After food';
  if (/before food|before meal|empty stomach|before breakfast/.test(combined)) {
    return 'Before food / empty stomach';
  }
  if (/with milk/.test(combined)) return 'With milk';
  return '';
}

function formatStructuredMedicineLines(medicines) {
  const list = Array.isArray(medicines)
    ? medicines.map(normalizeMedicineObject).filter(Boolean)
    : [];

  if (list.length === 0) {
    return ['• Your prescribed medicines (see pharmacy counter for details)'];
  }

  return list.map((med, index) => {
    const timings = inferMedicineTimings(med.frequency, med.notes);
    const food = formatFoodInstruction(med.notes, med.frequency);
    const lines = [`*${index + 1}. ${med.name}*`];

    if (med.recommendedDosage) lines.push(`   • Dose: ${med.recommendedDosage}`);
    lines.push(`   • When: ${timings}`);
    if (food) lines.push(`   • Food: ${food}`);
    if (med.usualDuration) lines.push(`   • Duration: ${med.usualDuration}`);
    if (med.frequency && med.frequency !== timings) lines.push(`   • Frequency: ${med.frequency}`);
    if (med.notes) lines.push(`   • Note: ${med.notes}`);

    return lines.join('\n');
  });
}

function formatTodayDate() {
  return new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function resolvePatientPhone(db, visit) {
  let phone = '';
  if (visit?.patientId) {
    try {
      const patientSnap = await db.collection('patients').doc(visit.patientId).get();
      if (patientSnap.exists) {
        phone = patientSnap.data().phone || '';
      }
    } catch {
      phone = '';
    }
  }
  if (!phone && visit?.patientPhone) {
    phone = String(visit.patientPhone).trim();
  }
  return phone;
}

function buildPrescriptionWhatsAppMessage({
  patientName,
  prescriptionLetter,
  diseases = [],
  visit,
  medicines,
}) {
  const label = patientName ? String(patientName).trim() : 'there';
  const diseaseNames = diseases
    .map((d) => (typeof d === 'string' ? d : d?.name || d?.id || ''))
    .filter(Boolean);
  const diseaseLine = diseaseNames.length ? `\n📋 *Diagnosis:* ${diseaseNames.join(', ')}\n` : '';

  const structured =
    structuredMedicinesFromVisit(visit).length > 0
      ? structuredMedicinesFromVisit(visit)
      : Array.isArray(medicines)
        ? medicines.map(normalizeMedicineObject).filter(Boolean)
        : [];

  const medicineBlock = formatStructuredMedicineLines(structured).join('\n\n');
  const letter = String(prescriptionLetter || '').trim();

  const body =
    letter.length > 80
      ? letter
      : medicineBlock || '• See your doctor\'s prescription at the pharmacy counter.';

  return (
    `🏥 *CareOps Hospital*\n` +
    `📋 *Prescription* — ${formatTodayDate()}\n\n` +
    `Hello ${label}!${diseaseLine}\n` +
    `Your doctor has prescribed the following:\n\n` +
    `💊 *Medicines & timings:*\n\n` +
    `${body}\n\n` +
    `⚠️ ${MEDICATION_DISCLAIMER}\n\n` +
    `— CareOps Hospital / CareOps AI`
  );
}

function buildPickupWhatsAppMessage({
  patientName,
  medicines,
  visit,
  totalAmount = 1000,
  frontendUrl,
}) {
  const label = patientName ? String(patientName).trim() : 'there';
  const baseUrl = (frontendUrl || patientFacingAppUrl()).replace(/\/$/, '');
  const structured =
    structuredMedicinesFromVisit(visit).length > 0
      ? structuredMedicinesFromVisit(visit)
      : Array.isArray(medicines)
        ? medicines.map(normalizeMedicineObject).filter(Boolean)
        : [];

  const medicineBlock = formatStructuredMedicineLines(structured).join('\n\n');
  const payUrl = `${baseUrl}/payment-success`;
  const bill = Number(totalAmount);
  const billLabel = Number.isFinite(bill) ? `₹${bill.toLocaleString('en-IN')}` : `₹${totalAmount}`;

  return (
    `🏥 *CareOps Hospital — Pharmacy*\n` +
    `📋 *Prescription ready* — ${formatTodayDate()}\n\n` +
    `Hello ${label}!\n` +
    `Your prescribed medicines are ready for pickup. 🎉\n\n` +
    `💊 *Medicines & when to take:*\n\n` +
    `${medicineBlock}\n\n` +
    `💰 *Bill:* ${billLabel}\n` +
    `📍 *Collect from:* Counter 2\n` +
    `💳 *Pay (demo):* ${payUrl}\n\n` +
    `⚠️ Take only as prescribed. Return if symptoms worsen.\n\n` +
    `— CareOps AI`
  );
}

module.exports = {
  MEDICATION_DISCLAIMER,
  patientFacingAppUrl,
  normalizeMedicineObject,
  structuredMedicinesFromVisit,
  structuredMedicinesToFlat,
  inferMedicineTimings,
  formatStructuredMedicineLines,
  resolvePatientPhone,
  buildPrescriptionWhatsAppMessage,
  buildPickupWhatsAppMessage,
};
