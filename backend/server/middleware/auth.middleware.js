import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    const user = await User.findOne({ _id: payload.sub, deletedAt: null });
    if (!user) return res.status(401).json({ message: 'Invalid authentication token' });

    const subscription = await Subscription.findOne({ user: user._id });
    req.user = user;
    req.subscription = subscription;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
  next();
}
