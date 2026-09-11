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
 * 2.x / 2.5 aliases 404 for new keys — Google now routes to gemini-3.x (see API error hints).
 * Override with GEMINI_MODEL if your key only supports a specific ID.
 */
function modelNameCandidates() {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const defaults = [
    'gemini-3.5-flash-lite',
    'gemini-3.6-flash',
    'gemini-3.1-pro-preview',
    'gemini-flash-latest',
  ];
  const list = [];
  if (envModel) list.push(envModel);
  for (const name of defaults) {
    if (!list.includes(name)) list.push(name);
  }
  return list;
}

function getRequestTimeoutMs(override) {
  if (override != null && Number.isFinite(override) && override > 0) return override;
  const v = parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS || '8000', 10);
  return Number.isFinite(v) && v > 0 ? v : 8000;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label || 'Gemini request'} timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
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

function isModelUnavailable(err) {
  return err?.status === 503 || /503|high demand|unavailable/i.test(String(err?.message || ''));
}

function fastTriageFromSymptoms(symptoms) {
  const s = String(symptoms || '').toLowerCase();
  if (
    /\b(chest pain|heart attack|can't breathe|cannot breathe|not breathing|unconscious|unresponsive|severe bleeding|stroke|seizure|cardiac arrest)\b/.test(
      s
    )
  ) {
    return { urgency: 'EMERGENCY', department: 'Emergency', reason: 'Critical symptom keywords' };
  }
  if (
    /\b(high fever|104|105|severe pain|vomiting blood|blood in stool|dehydration|fainting)\b/.test(s)
  ) {
    return { urgency: 'PRIORITY', department: 'General', reason: 'Urgent symptom keywords' };
  }
  return null;
}

function isModelNotFound(err) {
  const msg = String(err?.message || '');
  return (
    err?.status === 404 &&
    /no longer available|not found for API version|is not found|models\//i.test(msg)
  );
}

/** e.g. "use models/gemini-3.6-flash" in 404 bodies */
function extractSuggestedModelFrom404(err) {
  const msg = String(err?.message || '');
  const m = msg.match(/use models\/([a-z0-9.-]+)/i);
  return m ? m[1] : null;
}

async function generateContentWithFallback(request, options = {}) {
  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) {
    const err = new Error('GEMINI_API_KEY is not set');
    console.error('[Gemini]', err.message);
    throw err;
  }
  const perModelTimeoutMs = getRequestTimeoutMs(options.timeoutMs);
  const maxModels =
    options.maxModels != null && Number.isFinite(options.maxModels) && options.maxModels > 0
      ? Math.floor(options.maxModels)
      : null;
  const forceSkipAlternate = options.skipAlternatePass === true;
  const genAI = new GoogleGenerativeAI(key);
  const reqOpts = getGenerativeModelRequestOptions();
  let lastErr;

  async function tryModelOnce(name, opts) {
    const m = genAI.getGenerativeModel({ model: name }, opts);
    return m.generateContent(request);
  }

  async function tryModelWith429Retry(name, opts, apiLabelForLog) {
    try {
      return await tryModelOnce(name, opts);
    } catch (e) {
      if (isModelUnavailable(e)) throw e;
      if (!isRateLimited(e)) throw e;
      const wait = retryDelayMsFrom429(e);
      console.warn(`[Gemini] 429 on ${name} (${apiLabelForLog}) — waiting ${wait}ms then one retry`);
      await sleep(wait);
      return tryModelOnce(name, opts);
    }
  }

  async function tryOneModel(name, opts, label, passLabel) {
    const result = await withTimeout(
      tryModelWith429Retry(name, opts, label),
      perModelTimeoutMs,
      `Gemini ${name}`
    );
    console.log(`[Gemini] OK model=${name} api=${label}${passLabel ? ` ${passLabel}` : ''}`);
    return result;
  }

  async function runPass(opts, passLabel) {
    const label = opts.apiVersion || 'v1beta(default)';
    const names = modelNameCandidates().slice(0, maxModels || undefined);
    let modelNotFoundCount = 0;
    let modelsTried = 0;

    for (const name of names) {
      modelsTried += 1;
      try {
        return await tryOneModel(name, opts, label, passLabel);
      } catch (e) {
        lastErr = e;
        if (isModelNotFound(e)) {
          modelNotFoundCount += 1;
          const suggested = extractSuggestedModelFrom404(e);
          if (suggested && !names.includes(suggested)) {
            try {
              return await tryOneModel(suggested, opts, label, passLabel);
            } catch (suggestedErr) {
              lastErr = suggestedErr;
              console.warn(
                `[Gemini] fail suggested model=${suggested} api=${label}: ${suggestedErr.message}`
              );
            }
          }
        } else if (isModelUnavailable(e)) {
          console.warn(`[Gemini] skip model=${name} api=${label}: unavailable (${e.status || 503})`);
        } else {
          console.warn(`[Gemini] fail model=${name} api=${label}: ${e.message}`);
        }
      }
    }

    if (modelNotFoundCount >= modelsTried) {
      return { __allModelsNotFound: true };
    }
    return null;
  }

  let skipAlternate = false;
  let firstPass = await runPass(reqOpts, '');
  if (firstPass?.__allModelsNotFound) {
    skipAlternate = true;
    firstPass = null;
  } else if (firstPass) {
    return firstPass;
  }

  const alt = { apiVersion: reqOpts.apiVersion === 'v1' ? 'v1beta' : 'v1' };
  if (!forceSkipAlternate && !skipAlternate && !process.env.GEMINI_API_VERSION?.trim()) {
    let secondPass = await runPass(alt, '(alternate)');
    if (secondPass?.__allModelsNotFound) {
      secondPass = null;
    } else if (secondPass) {
      return secondPass;
    }
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

  let jsonModeAllModelsFailed = false;

  try {
    const result = await generateContentWithFallback(jsonBody);
    const text = extractResponseText(result);
    const parsed = text ? extractJsonObject(text) ?? extractJsonArray(text) : null;
    if (parsed != null) return parsed;
    console.warn(
      '[Gemini] JSON-mode response empty or not parseable; retrying as plain text (same prompt)'
    );
  } catch (e) {
    jsonModeAllModelsFailed = /all model attempts failed|timed out after/i.test(String(e?.message || ''));
    if (jsonModeAllModelsFailed) {
      console.warn('[Gemini] JSON-mode unavailable (models/key); skipping plain-text retry');
      return null;
    }
    console.warn('Gemini JSON-mode failed, trying plain text. First error:', e.message);
  }

  try {
    return await parseFromPlainTextRequest();
  } catch (e2) {
    console.warn('Gemini plain text failed:', e2.message);
    return null;
  }
}

async function classifyUrgency({ symptoms, age, conditions, allergies }) {
  const fallback = { urgency: 'GENERAL', department: 'General', reason: 'AI unavailable' };

  const fast = fastTriageFromSymptoms(symptoms);
  if (fast) return fast;

  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) return fallback;

  const prompt = `You are a hospital triage AI.
Classify the urgency of this patient.
Age: ${age}
Conditions: ${conditions}
Allergies: ${allergies}
Symptoms: ${symptoms}
Respond with valid JSON only. No markdown. No explanation.
Format: {"urgency": "EMERGENCY|PRIORITY|GENERAL", "department": "string", "reason": "string"}`;

  const classifyTimeoutMs = parseInt(process.env.GEMINI_CLASSIFY_TIMEOUT_MS || '7000', 10);
  const budgetMs =
    Number.isFinite(classifyTimeoutMs) && classifyTimeoutMs > 0 ? classifyTimeoutMs : 7000;

  try {
    const result = await withTimeout(
      generateContentWithFallback(prompt, {
        timeoutMs: Math.min(6000, budgetMs),
        maxModels: 2,
        skipAlternatePass: true,
      }),
      budgetMs,
      'classifyUrgency'
    );
    const text = extractResponseText(result);
    const parsed = text ? extractJsonObject(text) : null;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    if (!['EMERGENCY', 'PRIORITY', 'GENERAL'].includes(parsed.urgency)) {
      parsed.urgency = 'GENERAL';
    }
    return parsed;
  } catch (error) {
    console.warn('Gemini classifyUrgency fallback:', error.message);
    return fallback;
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

function buildFallbackPrescriptionLetter({ patientName, hospitalName, diseaseList, medLines }) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return (
    `${hospitalName}\nCareOps AI\nDate: ${today}\n\n` +
    `Patient: ${patientName || 'Patient'}\n\n` +
    `Diagnosis: ${diseaseList || 'As assessed by your doctor'}\n\n` +
    `Medicines:\n${medLines || '(See selected medicines on file)'}\n\n` +
    `Please take medicines as directed. Return if symptoms worsen or do not improve.\n\n` +
    `Prescribed under the clinical judgment of your treating physician at ${hospitalName}.`
  );
}

async function generatePrescriptionLetter({
  patientName,
  age,
  conditions,
  allergies,
  vitals,
  diseases,
  medicines,
  hospitalName = 'CareOps Hospital',
}) {
  const vitalsStr = vitals
    ? `BP: ${vitals.bp || 'N/A'}, Temp: ${vitals.temperature || 'N/A'}°F, SpO2: ${vitals.spo2 || 'N/A'}%`
    : 'N/A';

  const diseaseList = Array.isArray(diseases)
    ? diseases
        .map((d) => (typeof d === 'string' ? d : d?.name || d?.id || ''))
        .filter(Boolean)
        .join(', ')
    : '';

  const medLines = Array.isArray(medicines)
    ? medicines
        .map((m, i) => {
          if (typeof m === 'string') return `${i + 1}. ${m}`;
          const parts = [
            m.name,
            m.recommendedDosage || m.dosage || m.strength,
            m.frequency,
            m.usualDuration || m.duration,
            m.notes,
          ].filter(Boolean);
          return `${i + 1}. ${parts.join(' — ')}`;
        })
        .join('\n')
    : '';

  const prompt = `You are a clinical documentation assistant at ${hospitalName} (CareOps AI platform).
Write a patient-friendly prescription letter in plain natural language. Do NOT output JSON or markdown code blocks.

Patient: ${patientName || 'Patient'}, Age: ${age || 'unknown'}
Known conditions: ${conditions || 'none stated'}
Allergies: ${allergies || 'none stated'}
Vitals: ${vitalsStr}

Diagnoses for this visit: ${diseaseList || 'As discussed with doctor'}

Medicines selected by the doctor:
${medLines || 'None listed'}

Requirements:
- Start with a clear ${hospitalName} header and today's date
- Include patient name
- List each medicine with name, dosage/strength, frequency (morning/afternoon/night where applicable), food timing if relevant, and duration
- Add brief care instructions and follow-up advice appropriate to the conditions
- End with: "Prescribed under the clinical judgment of your treating physician at ${hospitalName}."
- Plain text only with line breaks for readability
- Professional, warm, and clear`;

  const fallback = buildFallbackPrescriptionLetter({
    patientName,
    hospitalName,
    diseaseList,
    medLines,
  });

  const key = (process.env.GEMINI_API_KEY || '').trim();
  if (!key) return fallback;

  const letterTimeoutMs = parseInt(process.env.GEMINI_PRESCRIPTION_TIMEOUT_MS || '10000', 10);
  const budgetMs =
    Number.isFinite(letterTimeoutMs) && letterTimeoutMs > 0 ? letterTimeoutMs : 10000;

  try {
    const result = await withTimeout(
      generateContentWithFallback(prompt, {
        timeoutMs: Math.min(8000, budgetMs),
        maxModels: 2,
        skipAlternatePass: true,
      }),
      budgetMs,
      'generatePrescriptionLetter'
    );
    const text = extractResponseText(result);
    if (text && text.trim()) return text.trim();
    console.warn('[Gemini] generatePrescriptionLetter returned empty body; using fallback template');
    return fallback;
  } catch (error) {
    console.warn('[Gemini] generatePrescriptionLetter fallback:', error.message);
    return fallback;
  }
}

module.exports = {
  classifyUrgency,
  generateSOAPNote,
  generateDecisionPanel,
  generatePrescriptionLetter,
};
