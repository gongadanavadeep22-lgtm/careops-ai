const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles } = require('../middleware/requireRole');
const { db } = require('../services/firestore');
const { generatePrescriptionLetter } = require('../services/gemini');
const { sendWhatsApp } = require('../services/twilio');
const { medicinesForVisit } = require('../utils/visitMedicines');
const {
  structuredMedicinesToFlat,
  resolvePatientPhone,
  buildPrescriptionWhatsAppMessage,
} = require('../utils/prescriptionMessages');

function normalizeDiseases(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((d) => {
      if (typeof d === 'string') return { id: d, name: d };
      if (!d || typeof d !== 'object') return null;
      return {
        id: String(d.id || d.name || '').trim(),
        name: String(d.name || d.id || '').trim(),
      };
    })
    .filter((d) => d && (d.id || d.name));
}

function normalizeMedicines(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((m) => m != null && (typeof m === 'string' ? m.trim() : m.name || m.recommendedDosage));
}

async function loadVisitPatient(visit) {
  let patient = {};
  if (visit.patientId) {
    const patientSnap = await db.collection('patients').doc(visit.patientId).get();
    if (patientSnap.exists) patient = patientSnap.data();
  }
  return patient;
}

// POST /api/prescription/draft
router.post('/draft', verifyToken, ...authRoles('doctor'), async (req, res, next) => {
  try {
    const { visitId, selectedDiseases, selectedMedicines } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    const visitSnap = await db.collection('visits').doc(visitId).get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const diseases = normalizeDiseases(selectedDiseases);
    const medicines = normalizeMedicines(selectedMedicines);

    await db.collection('visits').doc(visitId).update({
      selectedDiseases: diseases,
      selectedMedicines: medicines,
      prescriptionStatus: 'draft',
    });

    res.json({ success: true, selectedDiseases: diseases, selectedMedicines: medicines });
  } catch (err) {
    next(err);
  }
});

// POST /api/prescription/generate
router.post('/generate', verifyToken, ...authRoles('doctor'), async (req, res, next) => {
  try {
    const { visitId, selectedDiseases, selectedMedicines } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    const visitSnap = await db.collection('visits').doc(visitId).get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    const visit = visitSnap.data();
    const patient = await loadVisitPatient(visit);

    const diseases = normalizeDiseases(
      selectedDiseases != null ? selectedDiseases : visit.selectedDiseases
    );
    const medicines = normalizeMedicines(
      selectedMedicines != null ? selectedMedicines : visit.selectedMedicines
    );

    if (medicines.length === 0) {
      return res.status(400).json({ error: 'At least one medicine is required to generate a prescription' });
    }

    const prescriptionLetter = await generatePrescriptionLetter({
      patientName: patient.name || visit.patientName || '',
      age: patient.age || '',
      conditions: patient.conditions || '',
      allergies: patient.allergies || '',
      vitals: visit.vitals || {},
      diseases,
      medicines,
    });

    const prescription = structuredMedicinesToFlat(medicines);

    await db.collection('visits').doc(visitId).update({
      selectedDiseases: diseases,
      selectedMedicines: medicines,
      prescriptionLetter,
      prescription,
      prescriptionStatus: 'draft',
    });

    res.json({
      success: true,
      prescriptionLetter,
      prescription,
      selectedDiseases: diseases,
      selectedMedicines: medicines,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/prescription/confirm
router.post('/confirm', verifyToken, ...authRoles('doctor'), async (req, res, next) => {
  try {
    const { visitId, sendWhatsAppToPatient } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    const visitSnap = await db.collection('visits').doc(visitId).get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    const visit = visitSnap.data();

    const prescriptionLetter = String(visit.prescriptionLetter || '').trim();
    if (!prescriptionLetter) {
      return res.status(400).json({
        error: 'No prescription letter found. Generate a prescription first.',
      });
    }

    const meds = medicinesForVisit(visit);
    if (meds.length === 0) {
      return res.status(400).json({
        error: 'No medicines on this visit. Generate a prescription first.',
      });
    }

    await db.collection('visits').doc(visitId).update({
      prescriptionStatus: 'confirmed',
      status: 'completed',
    });

    if (visit.appointmentId) {
      await db.collection('appointments').doc(visit.appointmentId).update({
        status: 'completed',
      });
    }

    let whatsappSent = false;
    let whatsappWarning = null;
    let twilioError = null;

    if (sendWhatsAppToPatient === true) {
      const patientPhone = await resolvePatientPhone(db, visit);
      if (patientPhone) {
        const message = buildPrescriptionWhatsAppMessage({
          patientName: visit.patientName,
          prescriptionLetter,
          diseases: visit.selectedDiseases || [],
          visit,
        });

        try {
          await sendWhatsApp(patientPhone, message);
          whatsappSent = true;
          await db.collection('visits').doc(visitId).update({
            rxWhatsAppSentAt: new Date(),
          });
        } catch (whatsappErr) {
          const code = whatsappErr.code ?? whatsappErr.status;
          console.error('WhatsApp send failed:', whatsappErr.message, code || '');
          twilioError = {
            code: code != null ? String(code) : null,
            message: String(whatsappErr.message || 'Unknown Twilio error'),
          };
          whatsappWarning =
            'Prescription confirmed but WhatsApp was not delivered. ' +
            (code != null
              ? `Twilio error ${code}: ${whatsappErr.message}. `
              : `${whatsappErr.message}. `) +
            'If using the sandbox, the patient must join your sandbox first.';
        }
      } else {
        whatsappWarning = 'Prescription confirmed. No phone number found for patient.';
      }
    }

    res.json({
      success: true,
      whatsappSent,
      warning: whatsappWarning,
      ...(twilioError && { twilioError }),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
