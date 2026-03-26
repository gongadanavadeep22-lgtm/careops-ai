const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db, rtdb } = require('../services/firestore');
const { classifyUrgency } = require('../services/gemini');

// POST /api/checkin
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ error: 'appointmentId is required' });
    }

    // Step 1: Fetch appointment
    const apptRef = db.collection('appointments').doc(appointmentId);
    const apptSnap = await apptRef.get();

    if (!apptSnap.exists) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const appt = apptSnap.data();

    // Step 2: Fetch patient document
    let patient = {};
    if (appt.patientId) {
      const patientSnap = await db.collection('patients').doc(appt.patientId).get();
      if (patientSnap.exists) {
        patient = patientSnap.data();
      }
    }

    // Step 3: Run Gemini triage
    const triageResult = await classifyUrgency({
      symptoms: appt.symptoms || '',
      age: patient.age || '',
      conditions: patient.conditions || '',
      allergies: patient.allergies || '',
    });

    const { urgency, department, reason } = triageResult;

    // Step 4: Update appointment — status: arrived, set urgency and department
    await apptRef.update({
      status: 'arrived',
      urgency,
      department,
    });

    // Step 5: Create visit document
    const visitData = {
      appointmentId,
      patientId: appt.patientId || '',
      patientName: appt.patientName || '',
      patientPhone: (appt.patientPhone || patient.phone || '').trim().replace(/\s/g, ''),
      doctorId: appt.doctorId || '',
      clinicId: 'clinic-001',
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

    // Step 6: Write to Realtime Database if EMERGENCY
    if (urgency === 'EMERGENCY' && rtdb) {
      await rtdb.ref('emergencies').push({
        patientName: appt.patientName || '',
        symptoms: appt.symptoms || '',
        urgency: 'EMERGENCY',
        timestamp: Date.now(),
        active: true,
        clinicId: 'clinic-001',
      });
    }

    res.json({ success: true, visitId: visitRef.id, urgency, department, reason });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
