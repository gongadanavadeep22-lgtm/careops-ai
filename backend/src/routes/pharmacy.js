const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');
const { sendWhatsApp } = require('../services/twilio');
const { medicinesForVisit } = require('../utils/visitMedicines');

// GET /api/pharmacy/queue
router.get('/queue', verifyToken, async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('visits')
      .where('clinicId', '==', 'clinic-001')
      .where('prescriptionStatus', '==', 'confirmed')
      .get();

    const prescriptions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let patientPhone = '';

        if (data.patientId) {
          try {
            const patientSnap = await db.collection('patients').doc(data.patientId).get();
            if (patientSnap.exists) {
              patientPhone = patientSnap.data().phone || '';
            }
          } catch {
            patientPhone = '';
          }
        }
        if (!patientPhone && data.patientPhone) {
          patientPhone = String(data.patientPhone).trim();
        }

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

    res.json({ prescriptions });
  } catch (err) {
    next(err);
  }
});

// POST /api/pharmacy/ready
router.post('/ready', verifyToken, async (req, res, next) => {
  try {
    const { visitId } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    // Step 1: Get visit document
    const visitSnap = await db.collection('visits').doc(visitId).get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    const visit = visitSnap.data();

    // Step 2: Patient phone — Firestore profile first, then snapshot on visit (from check-in / booking)
    let patientPhone = '';
    if (visit.patientId) {
      const patientSnap = await db.collection('patients').doc(visit.patientId).get();
      if (patientSnap.exists) {
        patientPhone = patientSnap.data().phone || '';
      }
    }
    if (!patientPhone && visit.patientPhone) {
      patientPhone = String(visit.patientPhone).trim();
    }

    // Step 3: Update visit status
    await db.collection('visits').doc(visitId).update({
      prescriptionStatus: 'dispensed',
      dispensedAt: new Date(),
    });

    // Step 4: Fixed total amount ₹1000 (use SOAP plan if prescription array empty)
    const medicines = medicinesForVisit(visit);
    const totalAmount = 1000;

    // Step 5 & 6: Build and send WhatsApp message with SOAP notes
    let whatsappWarning = null;
    if (patientPhone) {
      const medicineList = medicines.map((m) => `✅ ${m}`).join('\n');
      const frontendUrl = (process.env.ALLOWED_ORIGIN || 'https://careops-ai-gamma.vercel.app').trim().replace(/['"]/g, '');

      const soapNote = visit.soapNote || {};
      const soapSection =
        soapNote.subjective || soapNote.objective || soapNote.assessment || soapNote.plan
          ? `\n📋 *Consultation Summary (SOAP):*\n` +
            `S: ${soapNote.subjective || '—'}\n` +
            `O: ${soapNote.objective || '—'}\n` +
            `A: ${soapNote.assessment || '—'}\n` +
            `P: ${soapNote.plan || '—'}`
          : '';

      const healthTips = visit.healthTips || [];
      const tipsSection = healthTips.length
        ? `\n\n💡 *Health Tips:*\n${healthTips.map((t) => `• ${t}`).join('\n')}`
        : '';

      const message = `Hello ${visit.patientName}!\nYour medicines are ready and packed. 🎉\n\n💊 *Prescription:*\n${medicineList}\n\n💰 *Total Amount: Rs ${totalAmount}*\n\n💳 Pay here: ${frontendUrl}/payment-success${soapSection}${tipsSection}\n\n📍 Please collect from Counter 2.\nThank you for choosing CareOps AI.`;

      try {
        await sendWhatsApp(patientPhone, message);
      } catch (whatsappErr) {
        console.error(
          'WhatsApp send failed:',
          whatsappErr.message,
          whatsappErr.code || whatsappErr.status || ''
        );
        whatsappWarning =
          'Prescription marked as ready but WhatsApp could not be sent. Check Railway logs and Twilio sandbox / FROM number.';
      }
    } else {
      whatsappWarning = 'Prescription marked as ready. No phone number found for patient.';
    }

    res.json({ success: true, totalAmount, warning: whatsappWarning });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
