const { db } = require('../services/firestore');

const DEFAULT_CLINIC_ID = 'clinic-001';

const { inferRoleAndName } = require('../utils/userProfile');

/**
 * Attach req.userProfile { uid, name, role, clinicId } from Firestore users/{uid}.
 */
async function loadUserProfile(req, res, next) {
  if (!req.user?.uid) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    const userRef = db.collection('users').doc(req.user.uid);
    let doc = await userRef.get();
    if (!doc.exists) {
      const email = req.user.email || '';
      const { role, name } = inferRoleAndName(email, req.user.name);
      const clinicId = DEFAULT_CLINIC_ID;
      const newUserData = {
        uid: req.user.uid,
        email,
        name,
        role,
        clinicId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await userRef.set(newUserData, { merge: true });
      req.userProfile = {
        uid: req.user.uid,
        name,
        role,
        clinicId,
      };
      return next();
    }
    const data = doc.data();
    req.userProfile = {
      uid: req.user.uid,
      name: data.name || '',
      role: String(data.role || '').trim().toLowerCase(),
      clinicId: data.clinicId || DEFAULT_CLINIC_ID,
    };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Require one of the given roles after loadUserProfile.
 * Usage: router.post('/x', verifyToken, loadUserProfile, requireRole('doctor'), handler)
 * Or: requireRole('nurse', 'ops')
 */
function requireRole(...allowedRoles) {
  const allowed = new Set(allowedRoles.map((r) => String(r).toLowerCase()));
  return (req, res, next) => {
    const role = req.userProfile?.role;
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

function getClinicId(req) {
  return req.userProfile?.clinicId || DEFAULT_CLINIC_ID;
}

/** Shorthand: [loadUserProfile, requireRole(...roles)] */
function authRoles(...allowedRoles) {
  return [loadUserProfile, requireRole(...allowedRoles)];
}

module.exports = { loadUserProfile, requireRole, authRoles, getClinicId, DEFAULT_CLINIC_ID };
