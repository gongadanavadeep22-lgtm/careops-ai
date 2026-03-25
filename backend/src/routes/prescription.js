const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');
const { medicinesForVisit } = require('../utils/visitMedicines');
const { debugSessionLog } = require('../utils/debugSessionLog');

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
    // #region agent log
    debugSessionLog({
      hypothesisId: 'H5',
      location: 'prescription.js:confirm:meds',
      message: 'confirm meds check',
      data: {
        medsCount: meds.length,
        visitIdPrefix: String(visitId).slice(0, 8),
        hasRx: Array.isArray(visit.prescription) && visit.prescription.length > 0,
        planLen: String(visit.soapNote?.plan || '').length,
      },
    });
    // #endregion
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

    // #region agent log
    debugSessionLog({
      hypothesisId: 'H5',
      location: 'prescription.js:confirm:ok',
      message: 'confirm success',
      data: {},
    });
    // #endregion
    res.json({ success: true });
  } catch (err) {
    // #region agent log
    debugSessionLog({
      hypothesisId: 'H5',
      location: 'prescription.js:confirm:catch',
      message: String(err.message || err),
      data: {},
    });
    // #endregion
    next(err);
  }
});

module.exports = router;
