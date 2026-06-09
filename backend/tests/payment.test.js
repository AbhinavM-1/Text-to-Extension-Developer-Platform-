import crypto from 'crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyRazorpaySignature, verifyRazorpayWebhookSignature } from '../server/services/payment.service.js';
import { createPaymentReceipt, getPaymentConfig } from '../server/controllers/subscription.controller.js';

test('verifies Razorpay checkout signatures with the configured secret', () => {
  const previousSecret = process.env.RAZORPAY_KEY_SECRET;
  process.env.RAZORPAY_KEY_SECRET = 'test_razorpay_secret';

  try {
    const orderId = 'order_test_123';
    const paymentId = 'pay_test_456';
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature }), true);
    assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: 'bad_signature' }), false);
  } finally {
    if (previousSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = previousSecret;
  }
});

test('verifies Razorpay webhook signatures against the raw request body', () => {
  const previousSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';

  try {
    const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
    const signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    assert.equal(verifyRazorpayWebhookSignature({ rawBody, signature }), true);
    assert.equal(verifyRazorpayWebhookSignature({ rawBody, signature: 'bad_signature' }), false);
  } finally {
    if (previousSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previousSecret;
  }
});

test('reports Razorpay readiness without exposing secrets', async () => {
  const previousKeyId = process.env.RAZORPAY_KEY_ID;
  const previousKeySecret = process.env.RAZORPAY_KEY_SECRET;
  const previousWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_KEY_ID = 'rzp_test_123';
  process.env.RAZORPAY_KEY_SECRET = 'secret_123';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook_123';

  try {
    let payload;
    await getPaymentConfig({}, { json: body => { payload = body; } });
    assert.equal(payload.configured, true);
    assert.equal(payload.keyIdAvailable, true);
    assert.equal(payload.webhookConfigured, true);
    assert.equal(Object.values(payload).some(value => String(value).includes('secret_123')), false);
  } finally {
    if (previousKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = previousKeyId;
    if (previousKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = previousKeySecret;
    if (previousWebhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhookSecret;
  }
});

test('creates short unique Razorpay receipts for repeated checkout attempts', () => {
  const userId = '6a230f3452e0f5055c4895f0';
  const receipts = new Set(Array.from({ length: 50 }, () => createPaymentReceipt(userId)));

  assert.equal(receipts.size, 50);
  assert.equal([...receipts].every(receipt => receipt.length <= 40), true);
  assert.equal([...receipts].every(receipt => receipt.startsWith('ext_')), true);
});
