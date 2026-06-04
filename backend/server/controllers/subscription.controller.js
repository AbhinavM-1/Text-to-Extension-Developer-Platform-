import { Subscription } from '../models/Subscription.js';
import { createRazorpayOrder, getRazorpayKeyId, verifyRazorpaySignature } from '../services/payment.service.js';

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

export async function getSubscription(req, res) {
  res.json(req.subscription || await Subscription.findOne({ user: req.user._id }));
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
    if (!['pro', 'premium'].includes(plan)) return res.status(422).json({ message: 'Paid checkout is available for Pro and Premium plans only' });
    if (!['monthly', 'yearly'].includes(billingCycle)) return res.status(422).json({ message: 'Invalid billing cycle' });
    if (!['upi', 'card', 'netbanking'].includes(paymentMethod)) return res.status(422).json({ message: 'Invalid payment method' });

    const amount = PLAN_PRICES[plan][billingCycle];
    const receipt = `extensio_${req.user._id}_${Date.now()}`.slice(0, 40);
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

    res.status(201).json({
      keyId: getRazorpayKeyId(),
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
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    } = req.body;

    if (!['pro', 'premium'].includes(plan)) return res.status(422).json({ message: 'Invalid paid plan' });
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(422).json({ message: 'Missing Razorpay payment verification fields' });
    }

    const isValid = verifyRazorpaySignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!isValid) return res.status(400).json({ message: 'Payment signature verification failed' });

    const amount = PLAN_PRICES[plan][billingCycle];
    const subscription = await Subscription.findOneAndUpdate(
      { user: req.user._id },
      {
        plan,
        status: 'active',
        billingCycle,
        paymentMethod,
        amount,
        currency: 'INR',
        paymentReference: razorpayPaymentId,
        lastPaidAt: new Date(),
        renewsAt: nextRenewalDate(billingCycle),
      },
      { new: true, upsert: true },
    );

    res.json({
      subscription,
      receipt: {
        status: 'paid',
        amount,
        currency: 'INR',
        plan,
        billingCycle,
        paymentMethod,
        reference: razorpayPaymentId,
        orderId: razorpayOrderId,
      },
    });
  } catch (error) {
    next(error);
  }
}
