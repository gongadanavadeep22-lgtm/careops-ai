const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');

// GET /api/doctors
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'doctor')
      .where('clinicId', '==', 'clinic-001')
      .get();

    const doctors = snapshot.docs.map((doc) => ({
      id: doc.id,
      uid: doc.data().uid || doc.id,
      name: doc.data().name || '',
    }));

    res.json({ doctors });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
