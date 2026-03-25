const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');
const { medicinesForVisit } = require('../utils/visitMedicines');

// POST /api/prescription/confirm
router.post('/confirm', verifyToken, async (req, res, next) => {
  try {
    const { visitId } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    const visitSnap = await db.collection('visits').doc(visitId).get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    const visit = visitSnap.data();

    const meds = medicinesForVisit(visit);
    if (meds.length === 0) {
      return res.status(400).json({
        error: 'No medicines or SOAP plan to send. Generate SOAP note first.',
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

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
