const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel(
  { model: 'gemini-1.5-flash' },
  { apiVersion: 'v1' }
);

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
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

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
1. Convert the transcript into a SOAP note.
2. Generate exactly 2 health tips to improve the patient's recovery beyond the prescription.
3. Validate each prescribed medicine against the patient's symptoms and diagnosis. If any medicine is wrong or inappropriate, flag it with a suggested correct medicine.

Respond with valid JSON only. No markdown. No explanation.
Format: {"subjective":"string","objective":"string","assessment":"string","plan":"string","prescription":["medicine name"],"healthTips":["tip 1","tip 2"],"prescriptionValidation":{"isCorrect":true,"status":"correct","message":"string","suggestedMedicines":[]}}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      subjective: parsed.subjective || '',
      objective: parsed.objective || '',
      assessment: parsed.assessment || '',
      plan: parsed.plan || '',
      prescription: parsed.prescription || [],
      healthTips: parsed.healthTips || [],
      prescriptionValidation: parsed.prescriptionValidation || { isCorrect: true, status: 'correct', message: '', suggestedMedicines: [] },
    };
  } catch (error) {
    console.error('Gemini SOAP error:', error.message);
    return { subjective: '', objective: '', assessment: '', plan: '', prescription: [], healthTips: [], prescriptionValidation: { isCorrect: true, status: 'correct', message: '', suggestedMedicines: [] } };
  }
}

async function generateDecisionPanel({ symptoms, age, conditions, allergies, vitals, pastVisits }) {
  const vitalsStr = vitals
    ? `BP: ${vitals.bp || 'N/A'}, Temp: ${vitals.temperature || 'N/A'}°F, SpO2: ${vitals.spo2 || 'N/A'}%`
    : 'N/A';
  const pastStr = pastVisits && pastVisits.length
    ? pastVisits.map((v, i) => `Visit ${i + 1}: ${v.symptoms || ''} (${v.urgency || ''})`).join('; ')
    : 'No past visits';

  const prompt = `You are a clinical decision support AI. Generate exactly 3 brief actionable clinical insights for the doctor. Each insight must be one sentence only.
Patient data — Age: ${age}, Conditions: ${conditions}, Allergies: ${allergies}, Vitals: ${vitalsStr}, Today symptoms: ${symptoms}, Past visits: ${pastStr}
Respond with valid JSON array only. No markdown.
Format: ["insight one","insight two","insight three"]`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return ['Review patient history carefully', 'Check current vitals', 'Consider allergies before prescribing'];
    }
    return parsed.slice(0, 5);
  } catch (error) {
    console.error('Gemini panel error:', error.message);
    return ['Review patient history carefully', 'Check current vitals', 'Consider allergies before prescribing'];
  }
}

module.exports = { classifyUrgency, generateSOAPNote, generateDecisionPanel };
