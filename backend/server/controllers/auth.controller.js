import { buildOAuthAuthorizationUrl, createPasswordReset, loginUser, loginWithOAuth, registerUser, resetPassword, updateUserProfile } from '../services/auth.service.js';
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

export async function completePasswordReset(req, res, next) {
  try {
    await resetPassword(req.body);
    res.json({ message: 'Password reset successful. You can login now.' });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const result = await updateUserProfile({
      user: req.user,
      name: req.body.name,
      email: req.body.email,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export function startOAuth(req, res, next) {
  try {
    res.redirect(buildOAuthAuthorizationUrl(req.params.provider));
  } catch (error) {
    const message = encodeURIComponent(error.message || 'OAuth provider is not ready');
    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?oauthError=${message}`);
  }
}

export async function completeOAuth(req, res, next) {
  try {
    const { code, state } = req.query;
    if (!code || !state) {
      return res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?oauthError=OAuth%20login%20was%20not%20completed`);
    }

    const result = await loginWithOAuth({
      providerName: req.params.provider,
      code,
      state,
    });

    const params = new URLSearchParams({ token: result.token });
    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?${params.toString()}`);
  } catch (error) {
    const message = encodeURIComponent(error.message || 'OAuth login failed');
    res.redirect(`${process.env.CLIENT_ORIGIN || 'http://localhost:5173'}/login?oauthError=${message}`);
  }
}
