const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles, getClinicId } = require('../middleware/requireRole');
const { db } = require('../services/firestore');
const { sendWhatsApp } = require('../services/twilio');
const { medicinesForVisit } = require('../utils/visitMedicines');
const {
  resolvePatientPhone,
  buildPickupWhatsAppMessage,
  patientFacingAppUrl,
} = require('../utils/prescriptionMessages');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const DEFAULT_BILL_AMOUNT = 1000;

function parseLimit(raw) {
  const n = parseInt(String(raw || DEFAULT_LIMIT), 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function resolveBillAmount(visit) {
  const raw = visit?.totalAmount ?? visit?.total ?? visit?.amountTotal ?? visit?.amount;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_BILL_AMOUNT;
}

// GET /api/pharmacy/queue
router.get('/queue', verifyToken, ...authRoles('pharmacist', 'doctor'), async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const limit = parseLimit(req.query.limit);
    const snapshot = await db
      .collection('visits')
      .where('clinicId', '==', clinicId)
      .where('prescriptionStatus', '==', 'confirmed')
      .limit(limit)
      .get();

    const prescriptions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        const onVisit = String(data.patientPhone || '').trim();
        const patientPhone = onVisit || (await resolvePatientPhone(db, data));

        return {
          id: doc.id,
          ...data,
          patientPhone,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          dispensedAt: data.dispensedAt?.toDate?.()?.toISOString() || data.dispensedAt,
        };
      })
    );

    prescriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ prescriptions, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/pharmacy/ready
router.post('/ready', verifyToken, ...authRoles('pharmacist'), async (req, res, next) => {
  try {
    const { visitId } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    const visitRef = db.collection('visits').doc(visitId);
    const visitSnap = await visitRef.get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    const visit = visitSnap.data();
    const totalAmount = resolveBillAmount(visit);

    const patientPhone = await resolvePatientPhone(db, visit);

    await visitRef.update({
      prescriptionStatus: 'dispensed',
      dispensedAt: new Date(),
      totalAmount,
    });

    const medicines = medicinesForVisit(visit);
    const frontendUrl = patientFacingAppUrl();
    const payUrl = `${frontendUrl.replace(/\/$/, '')}/payment-success?amount=${totalAmount}`;

    let whatsappWarning = null;
    let whatsappSent = false;
    let twilioError = null;

    if (patientPhone) {
      const message = buildPickupWhatsAppMessage({
        patientName: visit.patientName,
        visit,
        medicines,
        totalAmount,
        frontendUrl,
      });

      try {
        await sendWhatsApp(patientPhone, message);
        whatsappSent = true;
      } catch (whatsappErr) {
        const code = whatsappErr.code ?? whatsappErr.status;
        console.error('WhatsApp send failed:', whatsappErr.message, code || '');
        twilioError = {
          code: code != null ? String(code) : null,
          message: String(whatsappErr.message || 'Unknown Twilio error'),
        };
        whatsappWarning =
          'WhatsApp was not delivered. ' +
          (code != null
            ? `Twilio error ${code}: ${whatsappErr.message}. `
            : `${whatsappErr.message}. `) +
          'If using the sandbox, the patient must join your sandbox first (send the join code to the Twilio WhatsApp number). Check TWILIO_WHATSAPP_FROM and Railway logs [Twilio].';
      }
    } else {
      whatsappWarning = 'Prescription marked as ready. No phone number found for patient.';
    }

    res.json({
      success: true,
      totalAmount,
      payUrl,
      whatsappSent,
      warning: whatsappWarning,
      prescriptionLetter: visit.prescriptionLetter || '',
      ...(twilioError && { twilioError }),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
