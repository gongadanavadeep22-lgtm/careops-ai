const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { db } = require('../services/firestore');

// POST /api/vitals
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const { visitId, bp, temperature, spo2 } = req.body;

    if (!visitId) {
      return res.status(400).json({ error: 'visitId is required' });
    }

    await db.collection('visits').doc(visitId).update({
      vitals: {
        bp: bp || '',
        temperature: Number(temperature),
        spo2: Number(spo2),
        recordedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
