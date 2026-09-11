const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles, getClinicId } = require('../middleware/requireRole');
const { db, rtdb } = require('../services/firestore');
const { classifyUrgency } = require('../services/gemini');

// POST /api/checkin
router.post('/', verifyToken, ...authRoles('nurse', 'ops'), async (req, res, next) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }

    const clinicId = getClinicId(req);
    const apptRef = db.collection('appointments').doc(appointmentId);
    const apptSnap = await apptRef.get();

    if (!apptSnap.exists) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appt = apptSnap.data();

    const patientRef = appt.patientId ? db.collection('patients').doc(appt.patientId) : null;
    const [patientSnap, triageResult] = await Promise.all([
      patientRef ? patientRef.get() : Promise.resolve(null),
      classifyUrgency({
        symptoms: appt.symptoms || '',
        age: '',
        conditions: '',
        allergies: '',
      }),
    ]);

    let patient = {};
    if (patientSnap?.exists) {
      patient = patientSnap.data();
    }

    const { urgency, department, reason } = triageResult;

    await apptRef.update({
      status: 'arrived',
      urgency,
      department,
    });

    const visitData = {
      appointmentId,
      patientId: appt.patientId || '',
      patientName: appt.patientName || '',
      patientPhone: (appt.patientPhone || patient.phone || '').trim().replace(/\s/g, ''),
      doctorId: appt.doctorId || '',
      clinicId,
      date: new Date(),
      symptoms: appt.symptoms || '',
      urgency,
      department,
      vitals: {},
      decisionPanel: [],
      voiceTranscript: '',
      soapNote: {},
      prescription: [],
      prescriptionStatus: 'draft',
      status: 'active',
      createdAt: new Date(),
    };

    const visitRef = await db.collection('visits').add(visitData);

    if (urgency === 'EMERGENCY' && rtdb) {
      await rtdb.ref('emergencies').push({
        patientName: appt.patientName || '',
        symptoms: appt.symptoms || '',
        urgency: 'EMERGENCY',
        timestamp: Date.now(),
        active: true,
        clinicId,
      });
    }

    res.json({ success: true, visitId: visitRef.id, urgency, department, reason });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
