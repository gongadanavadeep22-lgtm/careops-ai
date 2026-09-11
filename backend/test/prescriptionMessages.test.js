const { describe, it } = require('node:test');
const assert = require('node:assert');
const {
  inferMedicineTimings,
  formatStructuredMedicineLines,
  buildPickupWhatsAppMessage,
} = require('../src/utils/prescriptionMessages');

describe('prescription WhatsApp formatting', () => {
  it('infers morning and night for twice daily', () => {
    assert.strictEqual(inferMedicineTimings('Twice daily', ''), 'Morning & Night');
  });

  it('infers morning before food from notes', () => {
    assert.strictEqual(
      inferMedicineTimings('Once daily', 'before breakfast'),
      'Morning (before food)'
    );
  });

  it('formats structured medicines with dose, when, duration', () => {
    const lines = formatStructuredMedicineLines([
      {
        name: 'Artemether-Lumefantrine',
        recommendedDosage: '20/120 mg per dose (weight-based)',
        frequency: 'Twice daily',
        usualDuration: '3 days (6 doses total)',
        notes: 'Take after food',
      },
    ]);
    assert.match(lines[0], /\*1\. Artemether-Lumefantrine\*/);
    assert.match(lines[0], /When: Morning & Night/);
    assert.match(lines[0], /Food: After food/);
    assert.match(lines[0], /Duration: 3 days/);
  });

  it('buildPickupWhatsAppMessage includes structured prescription timings', () => {
    const msg = buildPickupWhatsAppMessage({
      patientName: 'Naveen',
      visit: {
        selectedMedicines: [
          {
            name: 'Chloroquine',
            recommendedDosage: '600 mg day 1',
            frequency: 'Once daily',
            usualDuration: '3 days',
            notes: 'After food',
          },
        ],
      },
      totalAmount: 1000,
      frontendUrl: 'https://careops-ai-gamma.vercel.app',
    });
    assert.match(msg, /Medicines & when to take/);
    assert.match(msg, /\*1\. Chloroquine\*/);
    assert.match(msg, /When: Morning \(once daily\)/);
    assert.match(msg, /\*Bill:\* ₹1,000/);
    assert.match(msg, /Pay \(demo\)/);
  });
});
