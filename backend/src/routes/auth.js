const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');
const { inferRoleAndName } = require('../utils/userProfile');

// GET /api/auth/me
// Returns the authenticated user's profile from Firestore (auto-provisions if missing)
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    const userRef = db.collection('users').doc(uid);
    let doc = await userRef.get();

    if (!doc.exists) {
      const email = req.user.email || '';
      const { role, name } = inferRoleAndName(email, req.user.name);
      const clinicId = 'clinic-001';

      const newUserData = {
        uid,
        email,
        name,
        role,
        clinicId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userRef.set(newUserData, { merge: true });
      return res.json({ uid, name, role, clinicId });
    }

    const { name, role, clinicId } = doc.data();

    res.json({ uid, name, role, clinicId: clinicId || 'clinic-001' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
