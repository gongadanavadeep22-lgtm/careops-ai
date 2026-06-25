const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles } = require('../middleware/requireRole');
const { rtdb } = require('../services/firestore');

// PATCH /api/emergency/dismiss
router.patch('/dismiss', verifyToken, ...authRoles('nurse', 'doctor', 'ops'), async (req, res, next) => {
  try {
    const { emergencyKey } = req.body;

    if (!emergencyKey) {
      return res.status(400).json({ error: 'emergencyKey is required' });
    }

    if (!rtdb) {
      return res.status(503).json({ error: 'Realtime Database not configured' });
    }

    await rtdb.ref(`emergencies/${emergencyKey}`).update({ active: false });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
