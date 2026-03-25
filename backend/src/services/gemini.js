const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Tries several model + API version pairs. Railway: GEMINI_API_KEY (required).
 * Optional: GEMINI_MODEL, GEMINI_API_VERSION=v1beta
 */
function modelCandidates() {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const envVer = process.env.GEMINI_API_VERSION === 'v1beta' ? 'v1beta' : 'v1';
  const list = [];
  if (envModel) list.push({ model: envModel, apiVersion: envVer });
  const defaults = [
    { model: 'gemini-2.0-flash', apiVersion: 'v1' },
    { model: 'gemini-2.0-flash-001', apiVersion: 'v1' },
    { model: 'gemini-1.5-flash-002', apiVersion: 'v1' },
    { model: 'gemini-1.5-flash-8b', apiVersion: 'v1' },
    { model: 'gemini-1.5-flash', apiVersion: 'v1beta' },
    { model: 'gemini-pro', apiVersion: 'v1beta' },
  ];
  for (const d of defaults) {
    if (!list.some((x) => x.model === d.model && x.apiVersion === d.apiVersion)) list.push(d);
  }
  return list;
}

async function generateContentWithFallback(request) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    const err = new Error('GEMINI_API_KEY is not set');
    console.error('[Gemini]', err.message);
    throw err;
  }
  const genAI = new GoogleGenerativeAI(key);
  let lastErr;
  for (const { model: name, apiVersion } of modelCandidates()) {
    try {
      const m = genAI.getGenerativeModel({ model: name }, { apiVersion });
      const result = await m.generateContent(request);
      console.log(`[Gemini] OK model=${name} api=${apiVersion}`);
      return result;
    } catch (e) {
      lastErr = e;
      console.warn(`[Gemini] fail model=${name} api=${apiVersion}: ${e.message}`);
    }
  }
  throw lastErr || new Error('Gemini: all model attempts failed');
}

function extractJsonObject(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function extractJsonArray(text) {
  if (!text || typeof text !== 'string') return null;
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  try {
    const p = JSON.parse(cleaned);
    if (Array.isArray(p)) return p;
  } catch {
    const start = cleaned.indexOf('[');
    const end = cleaned.lastIndexOf(']');
    if (start >= 0 && end > start) {
      try {
        const p = JSON.parse(cleaned.slice(start, end + 1));
        if (Array.isArray(p)) return p;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function normalizePrescription(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (item == null) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') {
          return [item.name, item.drug, item.medicine, item.dosage && `${item.name || ''} ${item.dosage}`.trim()]
            .filter(Boolean)
            .join(' ')
            .trim();
        }
        return String(item).trim();
      })
      .filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === 'object' && Array.isArray(raw.medicines)) {
    return normalizePrescription(raw.medicines);
  }
  return [];
}

async function generateContentJsonFirst(prompt) {
  const jsonBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };
  try {
    const result = await generateContentWithFallback(jsonBody);
    const text = result.response.text();
    return extractJsonObject(text) ?? extractJsonArray(text);
  } catch (e) {
    console.warn('Gemini JSON-mode failed, trying plain text:', e.message);
    try {
      const result = await generateContentWithFallback(prompt);
      const text = result.response.text();
      return extractJsonObject(text) ?? extractJsonArray(text);
    } catch (e2) {
      console.error('Gemini plain text failed:', e2.message);
      return null;
    }
  }
}

async function classifyUrgency({ symptoms, age, conditions, allergies }) {
  const prompt = `You are a hospital triage AI.
Classify the urgency of this patient.
Age: ${age}
Conditions: ${conditions}
Allergies: ${allergies}
Symptoms: ${symptoms}
Respond with valid JSON only. No markdown. No explanation.
Format: {"urgency": "EMERGENCY|PRIORITY|GENERAL", "department": "string", "reason": "string"}`;

  try {
    const parsed = await generateContentJsonFirst(prompt);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Invalid urgency JSON');
    }
    if (!['EMERGENCY', 'PRIORITY', 'GENERAL'].includes(parsed.urgency)) {
      parsed.urgency = 'GENERAL';
    }
    return parsed;
  } catch (error) {
    console.error('Gemini error:', error.message);
    return { urgency: 'GENERAL', department: 'General', reason: 'AI unavailable' };
  }
}

async function generateSOAPNote({ transcript, patientName, age, conditions, allergies, vitals }) {
  const vitalsStr = vitals
    ? `BP: ${vitals.bp || 'N/A'}, Temp: ${vitals.temperature || 'N/A'}°F, SpO2: ${vitals.spo2 || 'N/A'}%`
    : 'N/A';

  const prompt = `You are a clinical documentation assistant.
Patient: ${patientName}, Age: ${age}, Conditions: ${conditions}, Allergies: ${allergies}, Vitals: ${vitalsStr}
Doctor consultation transcript: ${transcript}

Do all of the following:
1. Convert the transcript into a SOAP note (fill all four sections from what the doctor said; infer clinical context briefly if needed).
2. Extract EVERY medicine, drug, or tablet the doctor told the patient to take. Put each as one string in "prescription" (include dose/frequency if mentioned). Normalize common speech errors (e.g. "dollar 650" may mean paracetamol brand Dolo 650).
3. Generate exactly 2 health tips for recovery beyond medicines.
4. Validate each prescribed medicine against symptoms and assessment in the SOAP. If any medicine is wrong or inappropriate, set isCorrect to false and explain in message; list suggestedMedicines as strings.

Respond with valid JSON only. No markdown. No explanation.
Format: {"subjective":"string","objective":"string","assessment":"string","plan":"string","prescription":["medicine with dose if known"],"healthTips":["tip 1","tip 2"],"prescriptionValidation":{"isCorrect":true,"status":"correct","message":"string","suggestedMedicines":[]}}`;

  const empty = {
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    prescription: [],
    healthTips: [],
    prescriptionValidation: { isCorrect: true, status: 'correct', message: '', suggestedMedicines: [] },
  };

  try {
    const parsed = await generateContentJsonFirst(prompt);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.error('Gemini SOAP: could not parse JSON object');
      return empty;
    }
    const prescription = normalizePrescription(parsed.prescription);
    const tips = Array.isArray(parsed.healthTips) ? parsed.healthTips.map(String).filter(Boolean).slice(0, 5) : [];
    const pv = parsed.prescriptionValidation || {};
    return {
      subjective: String(parsed.subjective || '').trim(),
      objective: String(parsed.objective || '').trim(),
      assessment: String(parsed.assessment || '').trim(),
      plan: String(parsed.plan || '').trim(),
      prescription,
      healthTips: tips.length >= 2 ? tips.slice(0, 2) : tips,
      prescriptionValidation: {
        isCorrect: pv.isCorrect !== false,
        status: pv.status || 'correct',
        message: String(pv.message || ''),
        suggestedMedicines: Array.isArray(pv.suggestedMedicines) ? pv.suggestedMedicines.map(String) : [],
      },
    };
  } catch (error) {
    console.error('Gemini SOAP error:', error.message);
    return empty;
  }
}

async function generateDecisionPanel({
  symptoms,
  age,
  conditions,
  allergies,
  vitals,
  pastVisits,
  consultationTranscript,
}) {
  const vitalsStr = vitals
    ? `BP: ${vitals.bp || 'N/A'}, Temp: ${vitals.temperature || 'N/A'}°F, SpO2: ${vitals.spo2 || 'N/A'}%`
    : 'N/A';
  const pastStr = pastVisits && pastVisits.length
    ? pastVisits.map((v, i) => `Visit ${i + 1}: ${v.symptoms || ''} (${v.urgency || ''})`).join('; ')
    : 'No past visits';

  const transcriptBlock = consultationTranscript
    ? `\nToday's consultation transcript (use for specific drug names, concerns, and follow-ups the doctor mentioned):\n${consultationTranscript}\n`
    : '';

  const prompt = `You are a clinical decision support AI. Generate exactly 3 brief actionable clinical insights for the doctor. Each insight must be one sentence only.
Patient data — Age: ${age}, Conditions: ${conditions}, Allergies: ${allergies}, Vitals: ${vitalsStr}, Today symptoms: ${symptoms}, Past visits: ${pastStr}
${transcriptBlock}
If a transcript is provided, at least one insight should reflect something specific from it (e.g. medicines or instructions mentioned).
Respond with valid JSON only. No markdown.
Format: {"insights":["insight one","insight two","insight three"]}`;

  const fallback = ['Review patient history carefully', 'Check current vitals', 'Consider allergies before prescribing'];

  try {
    const parsed = await generateContentJsonFirst(prompt);
    let list = null;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.insights)) {
      list = parsed.insights;
    } else if (Array.isArray(parsed) && parsed.length) {
      list = parsed;
    }
    if (!list || list.length === 0) {
      const result = await generateContentWithFallback(prompt);
      list = extractJsonArray(result.response.text());
    }
    if (!list || list.length === 0) return fallback;
    return list.map(String).filter(Boolean).slice(0, 5);
  } catch (error) {
    console.error('Gemini panel error:', error.message);
    return fallback;
  }
}

module.exports = { classifyUrgency, generateSOAPNote, generateDecisionPanel };
