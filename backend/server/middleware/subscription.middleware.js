import { Subscription } from '../models/Subscription.js';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function enforceGenerationQuota(req, res, next) {
  const subscription = req.subscription || await Subscription.findOne({ user: req.user._id });
  const plan = subscription?.plan || 'free';
  if (plan === 'pro' || plan === 'premium') return next();

  const key = todayKey();
  if (req.user.generationUsage.date !== key) {
    req.user.generationUsage = { date: key, count: 0 };
  }

  if (req.user.generationUsage.count >= 3) {
    return res.status(402).json({ message: 'Free plan limit reached: 3 extensions per day' });
  }

  req.user.generationUsage.count += 1;
  await req.user.save();
  next();
}

export function requirePremiumForApiExtensions(req, res, next) {
  const wantsApiExtension = /\b(api|fetch|oauth|webhook|external service|openai|stripe)\b/i.test(req.body.prompt || req.body.editPrompt || '');
  if (!wantsApiExtension) return next();
  if (req.subscription?.plan === 'premium') return next();
  res.status(402).json({ message: 'Premium plan required for API-call extensions' });
}
