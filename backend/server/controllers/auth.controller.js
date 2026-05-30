import { createPasswordReset, loginUser, registerUser } from '../services/auth.service.js';
import { Subscription } from '../models/Subscription.js';

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    res.json(await loginUser(req.body));
  } catch (error) {
    next(error);
  }
}

export async function me(req, res) {
  const subscription = await Subscription.findOne({ user: req.user._id });
  res.json({ user: req.user, subscription });
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await createPasswordReset(req.body.email);
    res.json({
      message: 'If that email exists, a reset link has been prepared.',
      resetToken: process.env.NODE_ENV === 'production' ? undefined : result.resetToken,
    });
  } catch (error) {
    next(error);
  }
}
