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

module.exports = { classifyUrgency };
