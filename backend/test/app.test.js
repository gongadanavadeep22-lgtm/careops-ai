require('./mock-firebase');

const { describe, it } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');

describe('CareOps API smoke tests', () => {
  it('GET / returns ok', async () => {
    const res = await request(app).get('/').set('Accept', 'application/json');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'CareOps API');
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'CareOps API');
  });

  it('GET /api/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
  });

  it('GET unknown API route returns 404 NOT_FOUND', async () => {
    const res = await request(app).get('/api/does-not-exist');
    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.code, 'NOT_FOUND');
  });
});
