import { Subscription } from '../models/Subscription.js';

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
