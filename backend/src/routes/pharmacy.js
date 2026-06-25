const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles, getClinicId } = require('../middleware/requireRole');
const { db } = require('../services/firestore');
const { sendWhatsApp } = require('../services/twilio');
const { medicinesForVisit } = require('../utils/visitMedicines');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseLimit(raw) {
  const n = parseInt(String(raw || DEFAULT_LIMIT), 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function soapField(v) {
  if (v == null || v === '') return '—';
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 400 ? `${s.slice(0, 397)}…` : s;
  }
  const s = String(v).trim();
  return s || '—';
}

function tipLine(t) {
  if (t == null) return '';
  if (typeof t === 'string') return t.trim();
  if (typeof t === 'object') {
    const x = t.text ?? t.tip ?? t.title ?? t.message;
    if (x != null) return String(x).trim();
    return JSON.stringify(t).slice(0, 200);
  }
  return String(t);
}

/** Single public app URL for links in WhatsApp (not comma-separated CORS list). */
function patientFacingAppUrl() {
  const explicit = (process.env.FRONTEND_PUBLIC_URL || '').trim().replace(/['"]/g, '');
  if (explicit) return explicit.replace(/\/$/, '');
  const raw = (process.env.ALLOWED_ORIGIN || 'https://careops-ai-gamma.vercel.app').trim();
  const first = raw.split(',')[0].trim().replace(/['"]/g, '');
  const base = first || 'https://careops-ai-gamma.vercel.app';
  return base.replace(/\/$/, '');
}

// GET /api/pharmacy/queue
router.get('/queue', verifyToken, ...authRoles('pharmacist', 'doctor'), async (req, res, next) => {
  try {
    const clinicId = getClinicId(req);
    const limit = parseLimit(req.query.limit);
    const snapshot = await db
      .collection('visits')
      .where('clinicId', '==', clinicId)
      .where('prescriptionStatus', '==', 'confirmed')
      .limit(limit)
      .get();

    const prescriptions = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data();
        let patientPhone = '';

        if (data.patientId) {
          try {
            const patientSnap = await db.collection('patients').doc(data.patientId).get();
            if (patientSnap.exists) {
              patientPhone = patientSnap.data().phone || '';
            }
          } catch {
            patientPhone = '';
          }
        }
        if (!patientPhone && data.patientPhone) {
          patientPhone = String(data.patientPhone).trim();
        }

        return {
          id: doc.id,
          ...data,
          patientPhone,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
          dispensedAt: data.dispensedAt?.toDate?.()?.toISOString() || data.dispensedAt,
        };
      })
    );

    prescriptions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ prescriptions, limit });
  } catch (err) {
    next(err);
  }
});

// POST /api/pharmacy/ready
router.post('/ready', verifyToken, ...authRoles('pharmacist'), async (req, res, next) => {
  try {
    const { visitId } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    // Step 1: Get visit document
    const visitSnap = await db.collection('visits').doc(visitId).get();
    if (!visitSnap.exists) {
      return res.status(404).json({ error: 'Visit not found' });
    }
    const visit = visitSnap.data();

    // Step 2: Patient phone — Firestore profile first, then snapshot on visit (from check-in / booking)
    let patientPhone = '';
    if (visit.patientId) {
      const patientSnap = await db.collection('patients').doc(visit.patientId).get();
      if (patientSnap.exists) {
        patientPhone = patientSnap.data().phone || '';
      }
    }
    if (!patientPhone && visit.patientPhone) {
      patientPhone = String(visit.patientPhone).trim();
    }

    // Step 3: Update visit status
    await db.collection('visits').doc(visitId).update({
      prescriptionStatus: 'dispensed',
      dispensedAt: new Date(),
    });

    // Step 4: Fixed total amount ₹1000 (use SOAP plan if prescription array empty)
    const medicines = medicinesForVisit(visit);
    const totalAmount = 1000;

    // Step 5 & 6: Build and send WhatsApp message with SOAP notes (read visit snapshot from before status update)
    let whatsappWarning = null;
    let whatsappSent = false;
    let twilioError = null;

    if (patientPhone) {
      const medicineList =
        medicines.length > 0
          ? medicines.map((m) => `• ${m}`).join('\n')
          : '• (See consultation summary below — no separate medicine list on file.)';
      const patientLabel = visit.patientName ? String(visit.patientName).trim() : 'there';
      const frontendUrl = patientFacingAppUrl();

      const soapNote = visit.soapNote || {};
      const hasSoap = [soapNote.subjective, soapNote.objective, soapNote.assessment, soapNote.plan].some(
        (x) => x != null && String(x).trim() !== ''
      );
      const soapSection = hasSoap
        ? `\n📋 *Consultation (SOAP):*\n` +
          `S: ${soapField(soapNote.subjective)}\n` +
          `O: ${soapField(soapNote.objective)}\n` +
          `A: ${soapField(soapNote.assessment)}\n` +
          `P: ${soapField(soapNote.plan)}`
        : '';

      const healthTipsRaw = Array.isArray(visit.healthTips) ? visit.healthTips : [];
      const tipsLines = healthTipsRaw.map(tipLine).filter(Boolean);
      const tipsSection = tipsLines.length
        ? `\n\n💡 *Health tips:*\n${tipsLines.map((t) => `• ${t}`).join('\n')}`
        : '';

      const payUrl = `${frontendUrl.replace(/\/$/, '')}/payment-success`;
      const message =
        `Hello ${patientLabel}!\nYour medicines are ready. 🎉\n\n` +
        `💊 *Medicines:*\n${medicineList}\n\n` +
        `💰 *Total: Rs ${totalAmount}*\n\n` +
        `💳 *Pay (demo):* ${payUrl}` +
        `${soapSection}${tipsSection}\n\n` +
        `📍 Collect from Counter 2.\n— CareOps AI`;

      try {
        await sendWhatsApp(patientPhone, message);
        whatsappSent = true;
      } catch (whatsappErr) {
        const code = whatsappErr.code ?? whatsappErr.status;
        console.error('WhatsApp send failed:', whatsappErr.message, code || '');
        twilioError = {
          code: code != null ? String(code) : null,
          message: String(whatsappErr.message || 'Unknown Twilio error'),
        };
        whatsappWarning =
          'WhatsApp was not delivered. ' +
          (code != null
            ? `Twilio error ${code}: ${whatsappErr.message}. `
            : `${whatsappErr.message}. `) +
          'If using the sandbox, the patient must join your sandbox first (send the join code to the Twilio WhatsApp number). Check TWILIO_WHATSAPP_FROM and Railway logs [Twilio].';
      }
    } else {
      whatsappWarning = 'Prescription marked as ready. No phone number found for patient.';
    }

    res.json({
      success: true,
      totalAmount,
      whatsappSent,
      warning: whatsappWarning,
      ...(twilioError && { twilioError }),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
