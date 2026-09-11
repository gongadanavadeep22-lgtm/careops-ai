const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles } = require('../middleware/requireRole');
const { db } = require('../services/firestore');

// GET /api/visits/by-appointment?appointmentId=
router.get('/by-appointment', verifyToken, ...authRoles('doctor', 'nurse'), async (req, res, next) => {
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

// GET /api/visits/history?patientId= — last 3 completed/prior visits for case view
router.get('/history', verifyToken, ...authRoles('doctor', 'nurse'), async (req, res, next) => {
  try {
    const { patientId, excludeVisitId } = req.query;
    if (!patientId) {
      return res.status(400).json({ error: 'patientId query param is required' });
    }

    const snapshot = await db.collection('visits').where('patientId', '==', patientId).get();
    const visits = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date?.toDate?.()?.toISOString() || data.createdAt?.toDate?.()?.toISOString() || data.date,
          symptoms: data.symptoms || '',
          urgency: data.urgency || '',
          department: data.department || '',
          status: data.status || '',
          assessment: data.soapNote?.assessment || '',
        };
      })
      .filter((v) => v.id !== excludeVisitId)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 3);

    res.json({ visits });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
