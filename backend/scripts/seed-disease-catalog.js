/**
 * Optional one-time seed: writes bundled diseaseCatalog.js entries to Firestore diseaseCatalog.
 * Usage: node backend/scripts/seed-disease-catalog.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { db } = require('../src/services/firestore');
const { DISEASE_CATALOG } = require('../src/data/diseaseCatalog');

async function seed() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not set. Aborting seed.');
    process.exit(1);
  }

  const batch = db.batch();
  for (const disease of DISEASE_CATALOG) {
    const ref = db.collection('diseaseCatalog').doc(disease.id);
    batch.set(ref, disease, { merge: true });
  }

  await batch.commit();
  console.log(`Seeded ${DISEASE_CATALOG.length} diseases to Firestore collection "diseaseCatalog".`);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
