const fs = require('fs');
const path = require('path');

const LOG_CANDIDATES = [
  path.join(__dirname, '..', '..', '..', 'debug-74527c.log'),
  path.join(process.cwd(), '..', 'debug-74527c.log'),
  path.join(process.cwd(), 'debug-74527c.log'),
];
const INGEST = 'http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7';

function debugSessionLog(payload) {
  const body = { sessionId: '74527c', timestamp: Date.now(), ...payload };
  const line = `${JSON.stringify(body)}\n`;
  for (const p of LOG_CANDIDATES) {
    try {
      fs.appendFileSync(p, line);
      break;
    } catch (_) {
      /* try next */
    }
  }
  fetch(INGEST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

module.exports = { debugSessionLog };
