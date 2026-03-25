const { admin } = require('../services/firestore');

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    // #region agent log
    try {
      const { debugSessionLog } = require('../utils/debugSessionLog');
      debugSessionLog({
        hypothesisId: 'H2',
        location: 'verifyToken.js:catch',
        message: 'verifyIdToken failed',
        data: { path: req.path, method: req.method },
      });
    } catch (_) {
      /* ignore */
    }
    // #endregion
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = verifyToken;
