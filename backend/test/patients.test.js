const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const patientsRouteSrc = fs.readFileSync(
  path.join(__dirname, '../src/routes/patients.js'),
  'utf8'
);

test('patient profile allows the same phone on multiple accounts', () => {
  assert.doesNotMatch(patientsRouteSrc, /DUPLICATE_PHONE/);
  assert.doesNotMatch(patientsRouteSrc, /already registered to/i);
});
