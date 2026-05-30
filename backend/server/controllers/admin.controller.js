import { User } from '../models/User.js';
import { Extension } from '../models/Extension.js';
import { Subscription } from '../models/Subscription.js';

export async function analytics(req, res) {
  const [users, extensions, subscriptions] = await Promise.all([
    User.countDocuments(),
    Extension.countDocuments(),
    Subscription.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
  ]);
  res.json({ users, extensions, subscriptions });
}

export async function listUsers(req, res) {
  res.json(await User.find().sort({ createdAt: -1 }).limit(200));
}

export async function listAllExtensions(req, res) {
  res.json(await Extension.find().populate('owner', 'name email').sort({ createdAt: -1 }).limit(200));
}

export async function deleteAnyExtension(req, res) {
  await Extension.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}

export async function manageSubscription(req, res) {
  const subscription = await Subscription.findOneAndUpdate(
    { user: req.params.userId },
    { plan: req.body.plan, status: req.body.status || 'active' },
    { new: true, upsert: true },
  );
  res.json(subscription);
}
