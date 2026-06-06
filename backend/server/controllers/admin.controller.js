import { User } from '../models/User.js';
import { Extension } from '../models/Extension.js';
import { Subscription } from '../models/Subscription.js';

export async function analytics(req, res) {
  const [users, extensions, subscriptions] = await Promise.all([
    User.countDocuments({ deletedAt: null }),
    Extension.countDocuments({ deletedAt: null }),
    Subscription.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
  ]);
  res.json({ users, extensions, subscriptions });
}

export async function listUsers(req, res) {
  res.json(await User.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(200));
}

export async function listAllExtensions(req, res) {
  res.json(await Extension.find({ deletedAt: null }).populate('owner', 'name email').sort({ createdAt: -1 }).limit(200));
}

export async function deleteAnyExtension(req, res) {
  await Extension.findByIdAndUpdate(req.params.id, { deletedAt: new Date() });
  res.json({ ok: true });
}

export async function manageSubscription(req, res) {
  if (!['free', 'pro', 'premium'].includes(req.body.plan)) {
    return res.status(422).json({ message: 'Invalid plan' });
  }
  if (req.body.status && !['active', 'past_due', 'canceled'].includes(req.body.status)) {
    return res.status(422).json({ message: 'Invalid subscription status' });
  }

  const subscription = await Subscription.findOneAndUpdate(
    { user: req.params.userId },
    { plan: req.body.plan, status: req.body.status || 'active' },
    { new: true, upsert: true },
  );
  res.json(subscription);
}

export async function deleteUser(req, res) {
  if (String(req.user._id) === String(req.params.id)) {
    return res.status(400).json({ message: 'You cannot delete your own admin account' });
  }

  const user = await User.findByIdAndUpdate(req.params.id, { deletedAt: new Date() }, { new: true });
  if (!user) return res.status(404).json({ message: 'User not found' });
  await Extension.updateMany({ owner: user._id, deletedAt: null }, { deletedAt: new Date() });
  res.json({ ok: true });
}
