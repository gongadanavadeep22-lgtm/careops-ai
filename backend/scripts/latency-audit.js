/**
 * Latency audit for CareOps backend (no auth required for local modules / health).
 * Run: node scripts/latency-audit.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const http = require('http');

async function timed(label, fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    console.log(`OK   ${label.padEnd(42)} ${String(ms).padStart(6)}ms`);
    return { ok: true, ms, result };
  } catch (err) {
    const ms = Date.now() - t0;
    console.log(`FAIL ${label.padEnd(42)} ${String(ms).padStart(6)}ms — ${err.message}`);
    return { ok: false, ms, error: err.message };
  }
}

function fetchHealth(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        resolve(JSON.parse(body));
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy(new Error('health timeout'));
    });
  });
}

async function main() {
  console.log('\nCareOps latency audit\n');

  const port = process.env.PORT || 4000;
  await timed('GET /health', () => fetchHealth(port));

  delete require.cache[require.resolve('../src/services/gemini')];
  const { classifyUrgency } = require('../src/services/gemini');
  const { mergeMedicinesForDiseaseIds } = require('../src/data/diseaseCatalog');

  await timed('classifyUrgency (keyword EMERGENCY)', async () => {
    const r = await classifyUrgency({
      symptoms: 'severe chest pain and cannot breathe',
      age: '55',
      conditions: '',
      allergies: '',
    });
    if (r.urgency !== 'EMERGENCY') throw new Error(`expected EMERGENCY, got ${r.urgency}`);
    return r;
  });

  await timed('classifyUrgency (keyword PRIORITY)', async () => {
    const r = await classifyUrgency({
      symptoms: 'high fever 104 and severe pain',
      age: '30',
      conditions: '',
      allergies: '',
    });
    if (r.urgency !== 'PRIORITY') throw new Error(`expected PRIORITY, got ${r.urgency}`);
    return r;
  });

  await timed('classifyUrgency (GENERAL path)', async () => {
    const r = await classifyUrgency({
      symptoms: 'mild headache for two days',
      age: '28',
      conditions: '',
      allergies: '',
    });
    if (!r.urgency) throw new Error('missing urgency');
    return r;
  });

  await timed('mergeMedicinesForDiseaseIds (local)', async () => {
    const meds = mergeMedicinesForDiseaseIds(['common-cold', 'fever']);
    if (!Array.isArray(meds) || meds.length === 0) throw new Error('no medicines merged');
    return meds.length;
  });

  console.log('\nBudget targets (p95):');
  console.log('  check-in (with AI):     < 8s');
  console.log('  check-in (fallback):    < 2s');
  console.log('  prescription generate:  < 12s (AI) / instant (fallback)');
  console.log('  Firestore reads:        < 300ms each');
  console.log('');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
