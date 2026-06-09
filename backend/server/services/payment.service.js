import crypto from 'crypto';
import Razorpay from 'razorpay';

let razorpayClient;

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error('Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env.');
    error.status = 503;
    throw error;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayClient;
}

export async function createRazorpayOrder({ amount, currency = 'INR', receipt, notes = {} }) {
  try {
    return await getRazorpayClient().orders.create({
      amount: amount * 100,
      currency,
      receipt,
      notes,
    });
  } catch (error) {
    const message = error?.error?.description || error?.message || 'Unable to create Razorpay order.';
    const checkoutError = new Error(`Razorpay checkout failed: ${message}`);
    checkoutError.status = error?.statusCode || 502;
    throw checkoutError;
  }
}

export async function fetchRazorpayOrder(orderId) {
  try {
    return await getRazorpayClient().orders.fetch(orderId);
  } catch (error) {
    const message = error?.error?.description || error?.message || 'Unable to fetch Razorpay order.';
    const checkoutError = new Error(`Razorpay order lookup failed: ${message}`);
    checkoutError.status = error?.statusCode || 502;
    throw checkoutError;
  }
}

export async function fetchRazorpayPayment(paymentId) {
  try {
    return await getRazorpayClient().payments.fetch(paymentId);
  } catch (error) {
    const message = error?.error?.description || error?.message || 'Unable to fetch Razorpay payment.';
    const checkoutError = new Error(`Razorpay payment lookup failed: ${message}`);
    checkoutError.status = error?.statusCode || 502;
    throw checkoutError;
  }
}

export function getRazorpayKeyId() {
  if (!process.env.RAZORPAY_KEY_ID) {
    const error = new Error('Razorpay key id is missing. Add RAZORPAY_KEY_ID to backend/.env.');
    error.status = 503;
    throw error;
  }

  return process.env.RAZORPAY_KEY_ID;
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    const error = new Error('Razorpay key secret is missing. Add RAZORPAY_KEY_SECRET to backend/.env.');
    error.status = 503;
    throw error;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return safeCompare(expectedSignature, signature);
}

export function verifyRazorpayWebhookSignature({ rawBody, signature }) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    const error = new Error('Razorpay webhook secret is missing. Add RAZORPAY_WEBHOOK_SECRET to backend/.env.');
    error.status = 503;
    throw error;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return safeCompare(expectedSignature, signature);
}

function safeCompare(expected, actual = '') {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
