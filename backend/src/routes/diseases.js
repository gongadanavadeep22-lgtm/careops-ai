const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { authRoles } = require('../middleware/requireRole');
const { db } = require('../services/firestore');
const {
  DISEASE_CATALOG,
  MEDICATION_DISCLAIMER,
  mergeMedicinesForDiseaseIds,
} = require('../data/diseaseCatalog');

const COLLECTION = 'diseaseCatalog';

async function loadCatalogFromFirestore() {
  try {
    const snap = await db.collection(COLLECTION).where('active', '==', true).get();
    if (snap.empty) return null;
    return snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  } catch (err) {
    console.warn('[diseases] Firestore catalog unavailable, using bundled:', err.message);
    return null;
  }
}

// GET /api/diseases — bundled catalog by default (fast); set DISEASE_CATALOG_SOURCE=firestore to use DB
router.get('/', verifyToken, ...authRoles('doctor', 'pharmacist', 'ops'), async (req, res, next) => {
  try {
    let diseases = DISEASE_CATALOG.filter((disease) => disease.active !== false);
    let source = 'bundled';

    if (process.env.DISEASE_CATALOG_SOURCE === 'firestore') {
      const firestoreCatalog = await loadCatalogFromFirestore();
      if (firestoreCatalog?.length) {
        diseases = firestoreCatalog;
        source = 'firestore';
      }
    }

    res.json({
      diseases,
      source,
      disclaimer: MEDICATION_DISCLAIMER,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/diseases/merge-medicines
router.post('/merge-medicines', verifyToken, ...authRoles('doctor'), async (req, res, next) => {
  try {
    const { diseaseIds } = req.body;
    if (!Array.isArray(diseaseIds)) {
      return res.status(400).json({ error: 'diseaseIds must be an array' });
    }

    const medicines = mergeMedicinesForDiseaseIds(diseaseIds);
    res.json({ medicines });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
