const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db, admin } = require('../services/firestore');

// POST /api/appointments/book
router.post('/book', verifyToken, async (req, res, next) => {
  try {
    const {
      patientId,
      patientName,
      patientPhone,
      patientArea,
      doctorId,
      doctorName,
      scheduledAt,
      symptoms,
    } = req.body;

    if (!patientName || !doctorId || !doctorName || !scheduledAt || !symptoms) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const appointmentData = {
      patientId: patientId || '',
      patientName: patientName.trim(),
      patientPhone: (patientPhone || '').trim(),
      patientArea: (patientArea || '').trim(),
      doctorId,
      doctorName: doctorName.trim(),
      clinicId: 'clinic-001',
      scheduledAt: new Date(scheduledAt),
      symptoms: symptoms.trim(),
      status: 'booked',
      urgency: null,
      department: null,
      createdAt: new Date(),
    };

    const ref = await db.collection('appointments').add(appointmentData);

    res.json({ success: true, appointmentId: ref.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/today
router.get('/today', verifyToken, async (req, res, next) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const snapshot = await db
      .collection('appointments')
      .where('clinicId', '==', 'clinic-001')
      .where('scheduledAt', '>=', startOfDay)
      .where('scheduledAt', '<=', endOfDay)
      .get();

    const appointments = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString() || doc.data().scheduledAt,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      }))
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
