import crypto from 'crypto';
import { Subscription } from '../models/Subscription.js';
import { Payment } from '../models/Payment.js';
import {
  createRazorpayOrder,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  getRazorpayKeyId,
  verifyRazorpaySignature,
  verifyRazorpayWebhookSignature,
} from '../services/payment.service.js';

const PLAN_PRICES = {
  free: { monthly: 0, yearly: 0 },
  pro: { monthly: 799, yearly: 7990 },
  premium: { monthly: 1999, yearly: 19990 },
};

function nextRenewalDate(cycle) {
  const date = new Date();
  if (cycle === 'yearly') {
    date.setFullYear(date.getFullYear() + 1);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  return date;
}

function validatePaidCheckout({ plan, billingCycle, paymentMethod }) {
  if (!['pro', 'premium'].includes(plan)) return 'Paid checkout is available for Pro and Premium plans only';
  if (!['monthly', 'yearly'].includes(billingCycle)) return 'Invalid billing cycle';
  if (!['upi', 'card', 'netbanking'].includes(paymentMethod)) return 'Invalid payment method';
  return null;
}

export function createPaymentReceipt(userId) {
  const userPart = String(userId).slice(-10);
  const timePart = Date.now().toString(36);
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `ext_${userPart}_${timePart}_${randomPart}`.slice(0, 40);
}

async function activatePaidSubscription({ userId, paymentRecord, razorpayPayment, razorpaySignature }) {
  const subscription = await Subscription.findOneAndUpdate(
    { user: userId },
    {
      plan: paymentRecord.plan,
      status: 'active',
      billingCycle: paymentRecord.billingCycle,
      paymentMethod: paymentRecord.paymentMethod,
      amount: paymentRecord.amount,
      currency: paymentRecord.currency,
      paymentReference: razorpayPayment.id,
      lastPaidAt: new Date(),
      renewsAt: nextRenewalDate(paymentRecord.billingCycle),
    },
    { new: true, upsert: true },
  );

  paymentRecord.subscription = subscription._id;
  paymentRecord.status = 'paid';
  paymentRecord.razorpayPaymentId = razorpayPayment.id;
  paymentRecord.razorpaySignature = razorpaySignature || paymentRecord.razorpaySignature;
  paymentRecord.rawPayment = razorpayPayment;
  paymentRecord.paidAt = new Date();
  await paymentRecord.save();

  return subscription;
}

export async function getSubscription(req, res) {
  res.json(req.subscription || await Subscription.findOne({ user: req.user._id }));
}

export async function getPaymentConfig(req, res) {
  const hasKeyId = Boolean(process.env.RAZORPAY_KEY_ID);
  const hasKeySecret = Boolean(process.env.RAZORPAY_KEY_SECRET);
  res.json({
    provider: 'razorpay',
    configured: hasKeyId && hasKeySecret,
    keyIdAvailable: hasKeyId,
    webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    supportedMethods: ['upi', 'card', 'netbanking'],
    currency: 'INR',
    message: hasKeyId && hasKeySecret
      ? 'Razorpay checkout is ready'
      : 'Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to backend/.env, then restart the backend.',
  });
}

export async function updateSubscription(req, res, next) {
  try {
    const plan = req.body.plan;
    if (!['free', 'pro', 'premium'].includes(plan)) return res.status(422).json({ message: 'Invalid plan' });

    const subscription = await Subscription.findOneAndUpdate(
      { user: req.user._id },
      { plan, status: 'active' },
      { new: true, upsert: true },
    );
    res.json(subscription);
  } catch (error) {
    next(error);
  }
}

export async function checkoutSubscription(req, res, next) {
  try {
    const { plan } = req.body;
    if (plan !== 'free') return res.status(422).json({ message: 'Paid plans require Razorpay payment verification' });

    const subscription = await Subscription.findOneAndUpdate(
      { user: req.user._id },
      {
        plan: 'free',
        status: 'active',
        billingCycle: 'monthly',
        paymentMethod: 'free',
        amount: 0,
        currency: 'INR',
        paymentReference: undefined,
        lastPaidAt: undefined,
        renewsAt: undefined,
      },
      { new: true, upsert: true },
    );

    res.json({
      subscription,
      receipt: {
        status: 'free',
        amount: 0,
        currency: 'INR',
        plan: 'free',
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function createPaymentOrder(req, res, next) {
  try {
    const { plan, billingCycle = 'monthly', paymentMethod = 'upi' } = req.body;
    const validationError = validatePaidCheckout({ plan, billingCycle, paymentMethod });
    if (validationError) return res.status(422).json({ message: validationError });

    const amount = PLAN_PRICES[plan][billingCycle];
    const receipt = createPaymentReceipt(req.user._id);
    const order = await createRazorpayOrder({
      amount,
      currency: 'INR',
      receipt,
      notes: {
        userId: String(req.user._id),
        plan,
        billingCycle,
        paymentMethod,
      },
    });
    const payment = await Payment.create({
      user: req.user._id,
      plan,
      billingCycle,
      paymentMethod,
      amount,
      amountPaise: amount * 100,
      currency: order.currency || 'INR',
      receipt: order.receipt,
      razorpayOrderId: order.id,
      rawOrder: order,
    });

    res.status(201).json({
      keyId: getRazorpayKeyId(),
      checkoutSessionId: payment._id,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      plan,
      billingCycle,
      paymentMethod,
      displayAmount: amount,
      user: {
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPayment(req, res, next) {
  try {
    const {
      plan,
      billingCycle = 'monthly',
      paymentMethod = 'upi',
      checkoutSessionId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    const validationError = validatePaidCheckout({ plan, billingCycle, paymentMethod });
    if (validationError) return res.status(422).json({ message: validationError });
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(422).json({ message: 'Missing Razorpay payment verification fields' });
    }
    if (!checkoutSessionId) return res.status(422).json({ message: 'Missing checkout session id' });

    const paymentRecord = await Payment.findOne({
      _id: checkoutSessionId,
      user: req.user._id,
      razorpayOrderId,
    });

    if (!paymentRecord) return res.status(404).json({ message: 'Checkout session not found for this user' });
    if (paymentRecord.status === 'paid') {
      const subscription = await Subscription.findOne({ user: req.user._id });
      return res.json({
        subscription,
        receipt: {
          status: 'paid',
          amount: paymentRecord.amount,
          currency: paymentRecord.currency,
          plan: paymentRecord.plan,
          billingCycle: paymentRecord.billingCycle,
          paymentMethod: paymentRecord.paymentMethod,
          reference: paymentRecord.razorpayPaymentId,
          orderId: paymentRecord.razorpayOrderId,
        },
      });
    }

    if (paymentRecord.plan !== plan || paymentRecord.billingCycle !== billingCycle || paymentRecord.paymentMethod !== paymentMethod) {
      return res.status(400).json({ message: 'Checkout details do not match the original order' });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) return res.status(400).json({ message: 'Payment signature verification failed' });

    const [razorpayOrder, razorpayPayment] = await Promise.all([
      fetchRazorpayOrder(razorpayOrderId),
      fetchRazorpayPayment(razorpayPaymentId),
    ]);

    if (razorpayOrder.amount !== paymentRecord.amountPaise || razorpayOrder.currency !== paymentRecord.currency) {
      return res.status(400).json({ message: 'Razorpay order amount or currency mismatch' });
    }

    if (razorpayPayment.order_id !== razorpayOrderId || razorpayPayment.amount !== paymentRecord.amountPaise || razorpayPayment.currency !== paymentRecord.currency) {
      return res.status(400).json({ message: 'Razorpay payment details do not match this order' });
    }

    if (razorpayPayment.status !== 'captured') {
      paymentRecord.status = razorpayPayment.status === 'failed' ? 'failed' : 'attempted';
      paymentRecord.razorpayPaymentId = razorpayPaymentId;
      paymentRecord.razorpaySignature = razorpaySignature;
      paymentRecord.rawPayment = razorpayPayment;
      paymentRecord.failureReason = `Payment status is ${razorpayPayment.status}`;
      await paymentRecord.save();
      return res.status(402).json({ message: `Payment is ${razorpayPayment.status}. Plan activates only after successful capture.` });
    }

    const subscription = await activatePaidSubscription({
      userId: req.user._id,
      paymentRecord,
      razorpayPayment,
      razorpaySignature,
    });

    res.json({
      subscription,
      receipt: {
        status: 'paid',
        amount: paymentRecord.amount,
        currency: paymentRecord.currency,
        plan: paymentRecord.plan,
        billingCycle: paymentRecord.billingCycle,
        paymentMethod: paymentRecord.paymentMethod,
        reference: razorpayPaymentId,
        orderId: razorpayOrderId,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function listPayments(req, res, next) {
  try {
    const payments = await Payment.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('-rawOrder -rawPayment -razorpaySignature');
    res.json({ items: payments });
  } catch (error) {
    next(error);
  }
}

export async function handleRazorpayWebhook(req, res, next) {
  try {
    const signature = req.get('x-razorpay-signature');
    if (!signature) return res.status(400).json({ message: 'Missing Razorpay webhook signature' });
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

    if (!verifyRazorpayWebhookSignature({ rawBody, signature })) {
      return res.status(400).json({ message: 'Invalid Razorpay webhook signature' });
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity?.order_id) return res.json({ received: true });

    const paymentRecord = await Payment.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (!paymentRecord) return res.json({ received: true });

    if (payload.event === 'payment.captured' && paymentRecord.status !== 'paid') {
      if (paymentEntity.amount === paymentRecord.amountPaise && paymentEntity.currency === paymentRecord.currency) {
        await activatePaidSubscription({
          userId: paymentRecord.user,
          paymentRecord,
          razorpayPayment: paymentEntity,
          razorpaySignature: signature,
        });
      }
    }

    if (payload.event === 'payment.failed') {
      paymentRecord.status = 'failed';
      paymentRecord.razorpayPaymentId = paymentEntity.id;
      paymentRecord.failureReason = paymentEntity.error_description || paymentEntity.error_reason || 'Payment failed';
      paymentRecord.rawPayment = paymentEntity;
      await paymentRecord.save();
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
}
