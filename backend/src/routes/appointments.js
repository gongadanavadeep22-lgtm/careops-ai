const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles, getClinicId } = require('../middleware/requireRole');
const { db } = require('../services/firestore');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(raw) {
  const n = parseInt(String(raw || DEFAULT_LIMIT), 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

// POST /api/appointments/book
router.post('/book', verifyToken, ...authRoles('patient', 'nurse', 'ops'), async (req, res, next) => {
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
    if (String(symptoms).trim().length < 10) {
      return res.status(400).json({ error: 'Please describe symptoms (minimum 10 characters).' });
    }

    const clinicId = getClinicId(req);
    const appointmentData = {
      patientId: patientId || '',
      patientName: patientName.trim(),
      patientPhone: (patientPhone || '').trim(),
      patientArea: (patientArea || '').trim(),
      doctorId,
      doctorName: doctorName.trim(),
      clinicId,
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
router.get('/today', verifyToken, ...authRoles('nurse', 'doctor', 'ops'), async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const limit = parseLimit(req.query.limit);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const snapshot = await db
      .collection('appointments')
      .where('clinicId', '==', clinicId)
      .get();

    const appointments = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString() || doc.data().scheduledAt,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      }))
      .filter((appt) => {
        const d = new Date(appt.scheduledAt);
        return d >= startOfDay && appt.status !== 'completed';
      })
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
      .slice(0, limit);

    res.json({ appointments, limit });
  } catch (err) {
    next(err);
  }
});

// GET /api/appointments/waiting — arrived patients in waiting room
router.get('/waiting', verifyToken, ...authRoles('nurse', 'doctor', 'ops'), async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const limit = parseLimit(req.query.limit);

    const snapshot = await db
      .collection('appointments')
      .where('clinicId', '==', clinicId)
      .where('status', '==', 'arrived')
      .limit(limit)
      .get();

    const appointments = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString() || doc.data().scheduledAt,
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
      }))
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    res.json({ appointments, limit });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
