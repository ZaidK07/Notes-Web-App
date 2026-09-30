import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildApp } from '../dist/app.js';

describe('Backend API Tests', () => {
  it('GET / should return 200 OK', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/',
    });

    assert.strictEqual(response.statusCode, 200);
    assert.ok(response.body.length > 0);
    await app.close();
  });

  it('GET /api/health should respond with services status', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/api/health',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.services);
    assert.ok(body.services.database);
    assert.ok(body.services.s3);
    await app.close();
  });

  it('POST /api/attachments/presign should reject empty payload', async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: 'POST',
      url: '/api/attachments/presign',
      payload: {},
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.ok(body.error);
    await app.close();
  });
});
