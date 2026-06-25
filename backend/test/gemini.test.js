const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

describe('Gemini service', () => {
  let originalKey;

  before(() => {
    originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete require.cache[require.resolve('../src/services/gemini')];
  });

  after(() => {
    if (originalKey !== undefined) {
      process.env.GEMINI_API_KEY = originalKey;
    }
    delete require.cache[require.resolve('../src/services/gemini')];
  });

  it('classifyUrgency degrades to GENERAL when API key is missing', async () => {
    const { classifyUrgency } = require('../src/services/gemini');
    const result = await classifyUrgency({
      symptoms: 'chest pain',
      age: '45',
      conditions: '',
      allergies: '',
    });
    assert.strictEqual(result.urgency, 'GENERAL');
    assert.strictEqual(result.department, 'General');
    assert.match(result.reason, /unavailable/i);
  });
});
