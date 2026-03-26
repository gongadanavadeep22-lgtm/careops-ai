const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');
const { generateSOAPNote, generateDecisionPanel } = require('../services/gemini');
const { debugSessionLog } = require('../utils/debugSessionLog');

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

    const hasAnySoap = [result.subjective, result.objective, result.assessment, result.plan].some((s) =>
      String(s || '').trim()
    );
    const hasRx = (result.prescription || []).length > 0;

    const pv = result.prescriptionValidation || {};
    const statusStr = typeof pv.status === 'string' ? pv.status : '';
    const wrongStatus =
      pv.isCorrect === false ||
      pv.status === false ||
      /\b(wrong|incorrect|inappropriate|unsafe|invalid)\b/i.test(statusStr);
    let prescriptionValidation = {
      isCorrect: !wrongStatus && pv.isCorrect !== false,
      status: wrongStatus ? 'wrong' : 'correct',
      message: pv.message || '',
      suggestedMedicines: Array.isArray(pv.suggestedMedicines) ? pv.suggestedMedicines : [],
    };
    if (!hasAnySoap && !hasRx) {
      const fromAi = String(pv.message || result.prescriptionValidation?.message || '').trim();
      prescriptionValidation = {
        isCorrect: false,
        status: 'wrong',
        message:
          fromAi.length > 10
            ? fromAi
            : 'No SOAP or medicines returned. In Railway: confirm GEMINI_API_KEY is a Google AI Studio key (starts with AIza), enable Generative Language API, then check logs for [Gemini] errors when you click Generate SOAP.',
        suggestedMedicines: [],
      };
    }

    await db.collection('visits').doc(visitId).update({
      soapNote: {
        subjective: result.subjective || '',
        objective: result.objective || '',
        assessment: result.assessment || '',
        plan: result.plan || '',
      },
      prescription: result.prescription || [],
      healthTips: result.healthTips || [],
      prescriptionValidation,
    });

    // #region agent log
    debugSessionLog({
      hypothesisId: 'H4',
      location: 'consultation.js:soap:response',
      message: 'SOAP generated',
      data: {
        visitIdLen: String(visitId).length,
        rxCount: (result.prescription || []).length,
        subjLen: String(result.subjective || '').length,
        validationOk: prescriptionValidation.isCorrect,
      },
    });
    // #endregion
    res.json({
      success: true,
      soapNote: result,
      prescription: result.prescription || [],
      healthTips: result.healthTips || [],
      prescriptionValidation,
    });
  } catch (err) {
    // #region agent log
    debugSessionLog({
      hypothesisId: 'H4',
      location: 'consultation.js:soap:catch',
      message: String(err.message || err),
      data: { visitIdLen: String(req.body?.visitId || '').length },
    });
    // #endregion
    next(err);
  }
});

// POST /api/consultation/panel  (optional body.transcript = consultation text for richer insights)
router.post('/panel', verifyToken, async (req, res, next) => {
  try {
    const { visitId, transcript: consultationTranscript } = req.body;

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

    let pastVisits = [];
    if (visit.patientId) {
      const pastSnap = await db
        .collection('visits')
        .where('patientId', '==', visit.patientId)
        .get();
      pastVisits = pastSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((v) => v.id !== visitId)
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? a.createdAt?.seconds * 1000 ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? b.createdAt?.seconds * 1000 ?? 0;
          return tb - ta;
        })
        .slice(0, 3);
    }

    let insights = await generateDecisionPanel({
      symptoms: visit.symptoms || '',
      age: patient.age || '',
      conditions: patient.conditions || '',
      allergies: patient.allergies || '',
      vitals: visit.vitals || {},
      pastVisits,
      consultationTranscript: typeof consultationTranscript === 'string' ? consultationTranscript.trim() : '',
    });
    if (!Array.isArray(insights) || insights.length === 0) {
      insights = [
        'Review patient history carefully',
        'Check current vitals',
        'Consider allergies before prescribing',
      ];
    }

    await db.collection('visits').doc(visitId).update({ decisionPanel: insights });

    // #region agent log
    debugSessionLog({
      hypothesisId: 'H4',
      location: 'consultation.js:panel:response',
      message: 'panel insights ready',
      data: {
        insightsCount: insights.length,
        firstLen: insights[0] ? String(insights[0]).length : 0,
        hasTranscript: Boolean(consultationTranscript && consultationTranscript.length),
      },
    });
    // #endregion
    res.json({ success: true, insights });
  } catch (err) {
    // #region agent log
    debugSessionLog({
      hypothesisId: 'H4',
      location: 'consultation.js:panel:catch',
      message: String(err.message || err),
      data: {},
    });
    // #endregion
    next(err);
  }
});

module.exports = router;
