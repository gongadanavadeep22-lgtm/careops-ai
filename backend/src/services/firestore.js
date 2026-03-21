git commit -m "feat: build Doctor Dashboard with SOAP notes, AI decision panel, emergency banner"const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

  const appConfig = {
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  };

  if (process.env.FIREBASE_DATABASE_URL) {
    appConfig.databaseURL = process.env.FIREBASE_DATABASE_URL;
  }

  admin.initializeApp(appConfig);
}

const db = admin.firestore();
const rtdb = process.env.FIREBASE_DATABASE_URL ? admin.database() : null;

module.exports = { admin, db, rtdb };
