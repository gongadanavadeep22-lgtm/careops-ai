const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');
const { generateSOAPNote, generateDecisionPanel } = require('../services/gemini');

// POST /api/consultation/soap
router.post('/soap', verifyToken, async (req, res, next) => {
  try {
    const { visitId, transcript } = req.body;

    if (!visitId || !transcript) {
      return res.status(400).json({ error: 'visitId and transcript are required' });
    }

    const visitSnap = await db.collection('visits').doc(visitId).get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    const visit = visitSnap.data();

    let patient = {};
    if (visit.patientId) {
      const patientSnap = await db.collection('patients').doc(visit.patientId).get();
      if (patientSnap.exists) patient = patientSnap.data();
    }

    const result = await generateSOAPNote({
      transcript,
      patientName: patient.name || visit.patientName || '',
      age: patient.age || '',
      conditions: patient.conditions || '',
      allergies: patient.allergies || '',
      vitals: visit.vitals || {},
    });

    await db.collection('visits').doc(visitId).update({
      soapNote: {
        subjective: result.subjective || '',
        objective: result.objective || '',
        assessment: result.assessment || '',
        plan: result.plan || '',
      },
      prescription: result.prescription || [],
      healthTips: result.healthTips || [],
      prescriptionValidation: result.prescriptionValidation || {},
    });

    res.json({
      success: true,
      soapNote: result,
      prescription: result.prescription || [],
      healthTips: result.healthTips || [],
      prescriptionValidation: result.prescriptionValidation || {},
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/consultation/panel
router.post('/panel', verifyToken, async (req, res, next) => {
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

    let patient = {};
    if (visit.patientId) {
      const patientSnap = await db.collection('patients').doc(visit.patientId).get();
      if (patientSnap.exists) patient = patientSnap.data();
    }

    const pastSnap = await db
      .collection('visits')
      .where('patientId', '==', visit.patientId || '')
      .get();

    const pastVisits = pastSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((v) => v.id !== visitId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3);

    const insights = await generateDecisionPanel({
      symptoms: visit.symptoms || '',
      age: patient.age || '',
      conditions: patient.conditions || '',
      allergies: patient.allergies || '',
      vitals: visit.vitals || {},
      pastVisits,
    });

    await db.collection('visits').doc(visitId).update({ decisionPanel: insights });

    res.json({ success: true, insights });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
