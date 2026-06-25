const express = require('express');
const router = express.Router();
const multer = require('multer');
const verifyToken = require('../middleware/verifyToken');
const { authRoles } = require('../middleware/requireRole');
const { db, admin } = require('../services/firestore');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  },
});

// GET /api/patients/profile
router.get('/profile', verifyToken, ...authRoles('patient'), async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const doc = await db.collection('patients').doc(uid).get();

    if (!doc.exists) {
      return res.json({
        uid: req.user.uid,
        name: '',
        age: '',
        area: '',
        phone: '',
        symptoms: '',
        allergies: '',
        conditions: '',
        appointmentDate: '',
        labReports: [],
      });
    }

    res.json({ ...doc.data(), uid: req.user.uid });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients/profile
router.post('/profile', verifyToken, ...authRoles('patient'), async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { name, age, area, phone, symptoms, allergies, conditions, appointmentDate } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!age || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      return res.status(400).json({ error: 'Please enter a valid age (1–120)' });
    }

    const profileData = {
      uid,
      name: name.trim(),
      age: Number(age),
      area: (area || '').trim(),
      phone: String(phone || '').trim().replace(/\s/g, ''),
      symptoms: (symptoms || '').trim(),
      allergies: (allergies || '').trim(),
      conditions: (conditions || '').trim(),
      appointmentDate: appointmentDate || '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('patients').doc(uid).set(profileData, { merge: true });

    res.json({ success: true, message: 'Profile saved successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/patients/lab-reports
router.post('/lab-reports', verifyToken, ...authRoles('patient'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uid = req.user.uid;
    const bucket = admin.storage().bucket();
    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `lab-reports/${uid}/${timestamp}_${safeName}`;
    const fileRef = bucket.file(filePath);

    await fileRef.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const [signedUrl] = await fileRef.getSignedUrl({
      action: 'read',
      expires,
    });

    const reportEntry = {
      name: req.file.originalname,
      url: signedUrl,
      storagePath: filePath,
      uploadedAt: new Date().toISOString(),
    };

    await db.collection('patients').doc(uid).set(
      { labReports: admin.firestore.FieldValue.arrayUnion(reportEntry) },
      { merge: true }
    );

    res.json({ success: true, report: reportEntry });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/list — registered patient profiles for staff booking
router.get('/list', verifyToken, ...authRoles('nurse', 'ops', 'doctor'), async (req, res, next) => {
  try {
    const q = String(req.query.q || '')
      .trim()
      .toLowerCase();
    const snap = await db.collection('patients').limit(200).get();
    let patients = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: data.uid || doc.id,
        name: data.name || '',
        phone: data.phone || '',
        area: data.area || '',
        symptoms: data.symptoms || '',
        age: data.age ?? '',
      };
    });
    if (q) {
      patients = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.area.toLowerCase().includes(q)
      );
    }
    patients.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    res.json({ patients: patients.slice(0, 50) });
  } catch (err) {
    next(err);
  }
});

// GET /api/patients/by-id?patientId=
router.get('/by-id', verifyToken, ...authRoles('doctor', 'nurse', 'pharmacist', 'ops'), async (req, res, next) => {
  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'patientId query param is required' });
    }

    const doc = await db.collection('patients').doc(patientId).get();

    res.json({ patient: doc.exists ? { id: doc.id, ...doc.data() } : null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
