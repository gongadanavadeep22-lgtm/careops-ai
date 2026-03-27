const fs = require('fs');
const path = require('path');

const ENDPOINT = 'http://127.0.0.1:7641/ingest/a3b49e1c-22af-442e-8175-8faad2b83bc7';
const LOG_FILE = path.join(__dirname, '../../..', 'debug-74527c.log');

/**
 * Debug NDJSON + optional Cursor ingest (local only). No secrets/PII.
 */
function agentDebug(payload) {
  const body = { sessionId: '74527c', ...payload, timestamp: Date.now() };
  try {
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(body)}\n`);
  } catch (_) {
    /* ignore */
  }
  fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '74527c' },
    body: JSON.stringify(body),
  }).catch(() => {});
}

module.exports = { agentDebug };
