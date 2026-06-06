import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRuntimeEnv } from '../server/config/env.js';

test('runtime env allows development with actionable warnings', () => {
  const result = validateRuntimeEnv({
    NODE_ENV: 'development',
    JWT_SECRET: 'dev-secret-change-me',
  });

  assert.equal(result.ok, true);
  assert.ok(result.warnings.some(warning => warning.includes('JWT_SECRET')));
  assert.ok(result.warnings.some(warning => warning.includes('GROQ_API_KEY')));
});

test('runtime env rejects weak production secrets', () => {
  const result = validateRuntimeEnv({
    NODE_ENV: 'production',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/extensio_ai',
    CLIENT_ORIGIN: 'https://extensio.example',
    API_PUBLIC_URL: 'https://api.extensio.example',
    JWT_SECRET: 'short',
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes('JWT_SECRET')));
});

test('runtime env rejects incomplete Razorpay credentials', () => {
  const result = validateRuntimeEnv({
    NODE_ENV: 'development',
    JWT_SECRET: 'a-secure-development-secret-value',
    RAZORPAY_KEY_ID: 'rzp_test_123',
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.includes('RAZORPAY_KEY_ID')));
});
