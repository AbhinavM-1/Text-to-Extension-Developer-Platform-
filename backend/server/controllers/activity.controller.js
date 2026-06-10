import { Activity } from '../models/Activity.js';
import { FREE_DAILY_GENERATION_LIMIT } from '../middleware/subscription.middleware.js';
import { todayUsage } from '../services/activity.service.js';

export async function getMyActivity(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 50);
    const items = await Activity.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const plan = req.subscription?.plan || 'free';
    const usage = todayUsage(req.user);

    res.json({
      items,
      dailyUsage: {
        date: usage.date,
        used: usage.count,
        limit: plan === 'free' ? FREE_DAILY_GENERATION_LIMIT : null,
        plan,
      },
    });
  } catch (error) {
    next(error);
  }
}
