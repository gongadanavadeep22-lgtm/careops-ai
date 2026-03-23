const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');
const { sendWhatsApp } = require('../services/twilio');

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

    // Step 2: Get patient phone
    let patientPhone = '';
    if (visit.patientId) {
      const patientSnap = await db.collection('patients').doc(visit.patientId).get();
      if (patientSnap.exists) {
        patientPhone = patientSnap.data().phone || '';
      }
    }

    // Step 3: Update visit status
    await db.collection('visits').doc(visitId).update({
      prescriptionStatus: 'dispensed',
      dispensedAt: new Date(),
    });

    // Step 4: Calculate total amount
    const medicines = visit.prescription || [];
    const totalAmount = medicines.length * 150;

    // Step 5 & 6: Build and send WhatsApp message
    let whatsappWarning = null;
    if (patientPhone) {
      const medicineList = medicines.map((m) => `✅ ${m}`).join('\n');
      const frontendUrl = (process.env.ALLOWED_ORIGIN || 'https://careops-ai-gamma.vercel.app').trim().replace(/['"]/g, '');
      const message = `Hello ${visit.patientName}!\nYour medicines are ready for pickup.\n\nPrescription:\n${medicineList}\n\nTotal Amount: Rs ${totalAmount}\n\nPay here: ${frontendUrl}/payment-success\n\nPlease collect from Counter 2.\nThank you for choosing CareOps AI.`;

      try {
        await sendWhatsApp(patientPhone, message);
      } catch (whatsappErr) {
        console.error('WhatsApp send failed:', whatsappErr.message);
        whatsappWarning = 'Prescription marked as ready but WhatsApp could not be sent.';
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
