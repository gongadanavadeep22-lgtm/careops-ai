const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles, getClinicId } = require('../middleware/requireRole');
const { db } = require('../services/firestore');

// GET /api/ops/summary — clinic operations overview
router.get('/summary', verifyToken, ...authRoles('ops', 'nurse', 'doctor'), async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    const [apptSnap, pharmacySnap, arrivedSnap] = await Promise.all([
      db.collection('appointments').where('clinicId', '==', clinicId).get(),
      db
        .collection('visits')
        .where('clinicId', '==', clinicId)
        .where('prescriptionStatus', '==', 'confirmed')
        .limit(100)
        .get(),
      db
        .collection('appointments')
        .where('clinicId', '==', clinicId)
        .where('status', '==', 'arrived')
        .limit(100)
        .get(),
    ]);

    const todayAppts = apptSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => {
        const scheduled = a.scheduledAt?.toDate?.() || new Date(a.scheduledAt || 0);
        return scheduled >= startOfDay;
      });

    const counts = { booked: 0, arrived: 0, completed: 0, other: 0 };
    for (const a of todayAppts) {
      const s = a.status || 'booked';
      if (s === 'booked') counts.booked += 1;
      else if (s === 'arrived') counts.arrived += 1;
      else if (s === 'completed') counts.completed += 1;
      else counts.other += 1;
    }

    const recentArrivals = arrivedSnap.docs
      .map((d) => ({
        id: d.id,
        patientName: d.data().patientName || '—',
        urgency: d.data().urgency || 'GENERAL',
        symptoms: d.data().symptoms || '',
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() || d.data().createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10);

    res.json({
      clinicId,
      today: {
        total: todayAppts.length,
        ...counts,
      },
      waitingCount: arrivedSnap.size,
      pharmacyPendingCount: pharmacySnap.size,
      recentArrivals,
      geminiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
      twilioConfigured: Boolean((process.env.TWILIO_ACCOUNT_SID || '').trim()),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
