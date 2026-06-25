/**
 * Sync Firestore users/{uid} for @careops.com demo accounts (merge only — does not delete data).
 * Run: node scripts/sync-users.js
 */
require('dotenv').config();
const admin = require('firebase-admin');

const accounts = [
  { email: 'doctor@careops.com', role: 'doctor', name: 'Dr Sharma' },
  { email: 'nurse@careops.com', role: 'nurse', name: 'Nurse Priya' },
  { email: 'pharmacy@careops.com', role: 'pharmacist', name: 'Pharmacist Anita' },
  { email: 'patient@careops.com', role: 'patient', name: 'Rupesh' },
  { email: 'ops@careops.com', role: 'ops', name: 'Ops Manager' },
];

async function main() {
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
  const db = admin.firestore();

  for (const a of accounts) {
    try {
      const user = await admin.auth().getUserByEmail(a.email);
      await db.collection('users').doc(user.uid).set(
        { uid: user.uid, name: a.name, role: a.role, clinicId: 'clinic-001' },
        { merge: true }
      );
      console.log('OK', a.role, a.email);
    } catch (e) {
      console.warn('SKIP', a.email, '-', e.message);
    }
  }
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
