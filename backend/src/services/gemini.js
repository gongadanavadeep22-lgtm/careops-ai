const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log('[Gemini] init — GEMINI_API_KEY set:', Boolean((process.env.GEMINI_API_KEY || '').trim()));

/**
 * Request options for @google/generative-ai. SDK default API version is v1beta (AI Studio keys).
 * Set GEMINI_API_VERSION=v1 only if you need the v1 surface explicitly.
 */
function getGenerativeModelRequestOptions() {
  const v = process.env.GEMINI_API_VERSION?.trim();
  if (v === 'v1') return { apiVersion: 'v1' };
  if (v === 'v1beta') return { apiVersion: 'v1beta' };
  return {};
}

/**
 * Model IDs for Google AI Studio / generativelanguage.googleapis.com (see https://ai.google.dev/gemini-api/docs/models).
 * Avoid deprecated aliases that 404 (e.g. gemini-1.5-flash, gemini-pro on many keys).
 * gemini-2.0-flash may 429 on free tier — we retry after backoff and try 2.5 / flash-latest (separate quotas).
 */
function modelNameCandidates() {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const defaults = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-2.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-001',
  ];
  const list = [];
  if (envModel) list.push(envModel);
  for (const name of defaults) {
    if (!list.includes(name)) list.push(name);
  }
  return list;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse "Please retry in 12.3s" from Gemini 429 bodies */
function retryDelayMsFrom429(err) {
  const msg = String(err?.message || '');
  const m = msg.match(/retry in ([\d.]+)s/i);
  if (m) return Math.min(90000, Math.ceil(parseFloat(m[1], 10) * 1000) + 750);
  return 4000;
}

function isRateLimited(err) {
  return err?.status === 429 || /429|Too Many Requests|quota|rate limit/i.test(String(err?.message || ''));
}

async function generateContentWithFallback(request) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    const err = new Error('GEMINI_API_KEY is not set');
    console.error('[Gemini]', err.message);
    throw err;
  }
  const genAI = new GoogleGenerativeAI(key);
  const reqOpts = getGenerativeModelRequestOptions();
  const apiLabel = reqOpts.apiVersion || 'v1beta(default)';
  let lastErr;

  async function tryModelOnce(name, opts) {
    const m = genAI.getGenerativeModel({ model: name }, opts);
    return m.generateContent(request);
  }

  async function tryModelWith429Retry(name, opts, apiLabelForLog) {
    try {
      return await tryModelOnce(name, opts);
    } catch (e) {
      if (!isRateLimited(e)) throw e;
      const wait = retryDelayMsFrom429(e);
      console.warn(`[Gemini] 429 on ${name} (${apiLabelForLog}) — waiting ${wait}ms then one retry`);
      await sleep(wait);
      return tryModelOnce(name, opts);
    }
  }

  async function runPass(opts, passLabel) {
    const label = opts.apiVersion || 'v1beta(default)';
    for (const name of modelNameCandidates()) {
      try {
        const result = await tryModelWith429Retry(name, opts, label);
        console.log(`[Gemini] OK model=${name} api=${label}${passLabel ? ` ${passLabel}` : ''}`);
        return result;
      } catch (e) {
        lastErr = e;
        console.warn(`[Gemini] fail model=${name} api=${label}: ${e.message}`);
      }
    }
    return null;
  }

  let result = await runPass(reqOpts, '');
  if (result) return result;

  const alt = { apiVersion: reqOpts.apiVersion === 'v1' ? 'v1beta' : 'v1' };
  if (!process.env.GEMINI_API_VERSION?.trim()) {
    result = await runPass(alt, '(alternate)');
    if (result) return result;
  }

  console.error('[Gemini] all models failed — last error:', lastErr);
  throw lastErr || new Error('Gemini: all model attempts failed');
}

/** Prefer response.text(); fall back to candidate parts (JSON mode sometimes leaves .text() empty). */
function extractResponseText(result) {
  if (!result?.response) return '';
  try {
    const t = result.response.text();
    if (typeof t === 'string' && t.trim()) return t;
  } catch (e) {
    console.warn('[Gemini] response.text() failed:', e.message);
  }
  const parts = result.response.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();
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

function buildSoapShapeFromParsed(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const prescription = normalizePrescription(parsed.prescription);
  const tips = Array.isArray(parsed.healthTips) ? parsed.healthTips.map(String).filter(Boolean).slice(0, 5) : [];
  const pv = parsed.prescriptionValidation || {};
  const subjective = String(parsed.subjective || '').trim();
  const objective = String(parsed.objective || '').trim();
  const assessment = String(parsed.assessment || '').trim();
  const plan = String(parsed.plan || '').trim();
  const hasAnySoap = subjective || objective || assessment || plan;
  const hasRx = prescription.length > 0;
  let prescriptionValidation = {
    isCorrect: pv.isCorrect !== false,
    status: pv.status || 'correct',
    message: String(pv.message || ''),
    suggestedMedicines: Array.isArray(pv.suggestedMedicines) ? pv.suggestedMedicines.map(String) : [],
  };
  if (!hasAnySoap && !hasRx) {
    prescriptionValidation = {
      isCorrect: false,
      status: 'wrong',
      message:
        'AI returned empty SOAP and no medicines. Check Railway logs for [Gemini] lines, API quota, and GEMINI_API_KEY (Google AI Studio).',
      suggestedMedicines: [],
    };
  }
  return {
    subjective,
    objective,
    assessment,
    plan,
    prescription,
    healthTips: tips.length >= 2 ? tips.slice(0, 2) : tips,
    prescriptionValidation,
  };
}

/** Shorter prompt when the full SOAP JSON prompt fails to parse or returns empty. */
async function generateSOAPMinimalJson({ transcript, patientName, age, conditions, allergies, vitals }) {
  const vitalsStr = vitals
    ? `BP: ${vitals.bp || 'N/A'}, Temp: ${vitals.temperature || 'N/A'}°F, SpO2: ${vitals.spo2 || 'N/A'}%`
    : 'N/A';
  const prompt = `Medical scribe: convert the transcript into one JSON object only. No markdown, no code fences.

Patient: ${patientName || 'Unknown'}, Age: ${age || 'unknown'}
Conditions: ${conditions || 'none stated'}, Allergies: ${allergies || 'none stated'}, Vitals: ${vitalsStr}

Transcript:
${transcript}

Return exactly this shape (fill strings and arrays from the transcript):
{"subjective":"","objective":"","assessment":"","plan":"","prescription":[],"healthTips":["",""],"prescriptionValidation":{"isCorrect":true,"status":"correct","message":"","suggestedMedicines":[]}}`;

  const parsed = await generateContentJsonFirst(prompt);
  return buildSoapShapeFromParsed(parsed);
}

async function generateContentJsonFirst(prompt) {
  const jsonBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  async function parseFromPlainTextRequest() {
    const result = await generateContentWithFallback(prompt);
    const text = extractResponseText(result);
    if (!text) {
      console.warn('[Gemini] plain-text path returned empty body');
      return null;
    }
    return extractJsonObject(text) ?? extractJsonArray(text);
  }

  try {
    const result = await generateContentWithFallback(jsonBody);
    const text = extractResponseText(result);
    const parsed = text ? extractJsonObject(text) ?? extractJsonArray(text) : null;
    if (parsed != null) return parsed;
    console.warn(
      '[Gemini] JSON-mode response empty or not parseable; retrying as plain text (same prompt)'
    );
  } catch (e) {
    console.warn('Gemini JSON-mode failed, trying plain text. First error:', e.message);
    console.error('Gemini JSON-mode error full:', e);
  }

  try {
    return await parseFromPlainTextRequest();
  } catch (e2) {
    console.error('Gemini plain text failed full:', e2);
    console.error('Gemini plain text failed message:', e2.message);
    return null;
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
    console.error('Gemini classifyUrgency error full:', error);
    console.error('Gemini classifyUrgency message:', error.message);
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
    prescriptionValidation: {
      isCorrect: false,
      status: 'wrong',
      message:
        'AI did not return a usable SOAP note. Check GEMINI_API_KEY on Railway, model access, and server logs for [Gemini] errors.',
      suggestedMedicines: [],
    },
  };

  try {
    let parsed = await generateContentJsonFirst(prompt);
    let shaped = buildSoapShapeFromParsed(parsed);

    if (
      !shaped ||
      (![shaped.subjective, shaped.objective, shaped.assessment, shaped.plan].some((s) => String(s || '').trim()) &&
        !(shaped.prescription || []).length)
    ) {
      console.warn('[Gemini] SOAP: primary prompt empty or unparseable; trying minimal SOAP prompt');
      shaped = await generateSOAPMinimalJson({
        transcript,
        patientName,
        age,
        conditions,
        allergies,
        vitals,
      });
    }

    if (
      shaped &&
      ([shaped.subjective, shaped.objective, shaped.assessment, shaped.plan].some((s) => String(s || '').trim()) ||
        (shaped.prescription || []).length > 0)
    ) {
      return shaped;
    }

    console.error('Gemini SOAP: could not parse JSON object or minimal fallback failed');
    return empty;
  } catch (error) {
    console.error('Gemini generateSOAPNote error full:', error);
    console.error('Gemini generateSOAPNote message:', error.message);
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
      const raw = extractResponseText(result);
      list = extractJsonArray(raw) ?? (extractJsonObject(raw)?.insights ?? null);
    }
    if (!list || list.length === 0) return fallback;
    return list.map(String).filter(Boolean).slice(0, 5);
  } catch (error) {
    console.error('Gemini generateDecisionPanel error full:', error);
    console.error('Gemini generateDecisionPanel message:', error.message);
    return fallback;
  }
}

module.exports = { classifyUrgency, generateSOAPNote, generateDecisionPanel };
