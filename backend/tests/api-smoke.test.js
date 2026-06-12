import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
    });
  });
}

test('health endpoint returns service status and runtime diagnostics', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'a-secure-development-secret-value';

  const { server, baseUrl } = await listen(createApp());
  try {
    const response = await fetch(`${baseUrl}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'extensio-api');
    assert.equal(typeof body.uptime, 'number');
    assert.ok(Array.isArray(body.warnings));
  } finally {
    server.close();
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('unknown routes return consistent JSON errors', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'a-secure-development-secret-value';

  const { server, baseUrl } = await listen(createApp());
  try {
    const response = await fetch(`${baseUrl}/missing-route`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.match(body.message, /Route not found/);
  } finally {
    server.close();
    if (previousSecret === undefined) delete process.env.JMT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
