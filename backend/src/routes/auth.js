const express = require('express');
const router = express.Router();

const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');

// GET /api/auth/me
// Returns the authenticated user's profile from Firestore
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const uid = req.user.uid;

    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found in Firestore' });
    }

    const { name, role, clinicId } = doc.data();

    res.json({ uid, name, role, clinicId });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
