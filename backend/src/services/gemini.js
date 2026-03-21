const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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

  const prompt = `You are a clinical documentation assistant. Convert this doctor consultation transcript into a structured SOAP note.
Patient: ${patientName}, Age: ${age}, Conditions: ${conditions}, Allergies: ${allergies}, Vitals: ${vitalsStr}
Transcript: ${transcript}
Respond with valid JSON only. No markdown. No explanation.
Format: {"subjective":"string","objective":"string","assessment":"string","plan":"string","prescription":["medicine string"]}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Gemini SOAP error:', error.message);
    return { subjective: '', objective: '', assessment: '', plan: '', prescription: [] };
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
