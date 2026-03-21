const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');

// GET /api/visits/by-appointment?appointmentId=
router.get('/by-appointment', verifyToken, async (req, res, next) => {
  try {
    const { appointmentId } = req.query;

    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId query param is required' });
    }

    const snapshot = await db
      .collection('visits')
      .where('appointmentId', '==', appointmentId)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    res.json({
      visit: {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.()?.toISOString() || data.date,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        vitals: data.vitals
          ? {
              ...data.vitals,
              recordedAt: data.vitals.recordedAt?.toDate?.()?.toISOString() || data.vitals.recordedAt,
            }
          : {},
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
