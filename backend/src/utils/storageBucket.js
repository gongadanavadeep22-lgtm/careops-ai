const { admin } = require('../services/firestore');

async function resolveStorageBucket() {
  const bucket = admin.storage().bucket();
  if (!bucket?.name) {
    throw new Error('Firebase Storage bucket is not configured (set FIREBASE_STORAGE_BUCKET)');
  }
  return bucket;
}

module.exports = { resolveStorageBucket };
