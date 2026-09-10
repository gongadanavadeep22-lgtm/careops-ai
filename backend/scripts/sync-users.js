/**
 * Sync Firestore users/{uid} for all Firebase Auth accounts (merge only — does not delete data).
 * Run: node scripts/sync-users.js
 */
require('dotenv').config();
const admin = require('firebase-admin');
const { inferRoleAndName } = require('../src/utils/userProfile');

const defaultAccounts = [
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

  // 1. Sync all existing users in Firebase Auth
  const list = await admin.auth().listUsers();
  console.log(`Found ${list.users.length} users in Firebase Authentication.`);

  for (const user of list.users) {
    const predefined = defaultAccounts.find(
      (a) => a.email.toLowerCase() === (user.email || '').toLowerCase()
    );
    const { role, name } = predefined || inferRoleAndName(user.email, user.displayName);

    await db.collection('users').doc(user.uid).set(
      {
        uid: user.uid,
        email: user.email,
        name: user.displayName || name,
        role,
        clinicId: 'clinic-001',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`✓ Synced: ${user.email} -> role: ${role} (uid: ${user.uid})`);
  }

  console.log('Sync completed successfully.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
