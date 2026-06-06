import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || 'dev-secret-change-me',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
  );
}

function getOAuthProviders() {
  const apiBaseUrl = process.env.API_PUBLIC_URL || 'http://localhost:3001';
  return {
    google: {
      label: 'Google',
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: `${apiBaseUrl}/api/auth/oauth/google/callback`,
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
      async profile(accessToken) {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return {
          providerId: data.sub,
          email: data.email,
          name: data.name || data.email?.split('@')[0],
        };
      },
    },
    github: {
      label: 'GitHub',
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      redirectUri: `${apiBaseUrl}/api/auth/oauth/github/callback`,
      authUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: 'user:email read:user',
      async profile(accessToken) {
        const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
        const [profileResponse, emailsResponse] = await Promise.all([
          fetch('https://api.github.com/user', { headers }),
          fetch('https://api.github.com/user/emails', { headers }),
        ]);
        const profile = await profileResponse.json();
        const emails = await emailsResponse.json();
        const primaryEmail = Array.isArray(emails)
          ? emails.find(item => item.primary && item.verified)?.email || emails.find(item => item.verified)?.email
          : null;
        return {
          providerId: String(profile.id),
          email: profile.email || primaryEmail,
          name: profile.name || profile.login,
        };
      },
    },
    microsoft: {
      label: 'Microsoft',
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      redirectUri: `${apiBaseUrl}/api/auth/oauth/microsoft/callback`,
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      scope: 'openid profile email User.Read',
      async profile(accessToken) {
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await response.json();
        return {
          providerId: data.id,
          email: data.mail || data.userPrincipalName,
          name: data.displayName || data.userPrincipalName?.split('@')[0],
        };
      },
    },
  };
}

function createState(provider) {
  return jwt.sign({ provider, purpose: 'oauth-login' }, process.env.JWT_SECRET || 'dev-secret-change-me', { expiresIn: '10m' });
}

function verifyState(state, provider) {
  const payload = jwt.verify(state, process.env.JWT_SECRET || 'dev-secret-change-me');
  return payload.provider === provider && payload.purpose === 'oauth-login';
}

function getProvider(providerName) {
  const provider = getOAuthProviders()[providerName];
  if (!provider) {
    const error = new Error('Unsupported OAuth provider');
    error.status = 404;
    throw error;
  }
  return provider;
}

function ensureProviderConfigured(provider) {
  if (!provider.clientId || !provider.clientSecret) {
    const error = new Error(`${provider.label} sign-in is not configured yet. Add OAuth client credentials to backend/.env.`);
    error.status = 503;
    throw error;
  }
}

export function buildOAuthAuthorizationUrl(providerName) {
  const provider = getProvider(providerName);
  ensureProviderConfigured(provider);
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    response_type: 'code',
    scope: provider.scope,
    state: createState(providerName),
    prompt: 'select_account',
  });
  return `${provider.authUrl}?${params.toString()}`;
}

async function exchangeOAuthCode(provider, code) {
  const response = await fetch(provider.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      redirect_uri: provider.redirectUri,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    const error = new Error(data.error_description || data.message || 'OAuth token exchange failed');
    error.status = 401;
    throw error;
  }
  return data.access_token;
}

export async function loginWithOAuth({ providerName, code, state }) {
  const provider = getProvider(providerName);
  ensureProviderConfigured(provider);
  if (!verifyState(state, providerName)) {
    const error = new Error('Invalid OAuth state');
    error.status = 401;
    throw error;
  }

  const accessToken = await exchangeOAuthCode(provider, code);
  const profile = await provider.profile(accessToken);
  if (!profile.email) {
    const error = new Error(`${provider.label} did not return a verified email address`);
    error.status = 422;
    throw error;
  }

  let user = await User.findOne({ email: profile.email.toLowerCase(), deletedAt: null });
  if (!user) {
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    user = await User.create({
      name: profile.name || profile.email.split('@')[0],
      email: profile.email,
      passwordHash,
      authProvider: providerName,
      providerId: profile.providerId,
    });
    await Subscription.create({ user: user._id, plan: 'free', status: 'active' });
  } else {
    user.authProvider = user.authProvider || providerName;
    user.providerId = user.providerId || profile.providerId;
    await user.save();
    await Subscription.findOneAndUpdate(
      { user: user._id },
      { $setOnInsert: { plan: 'free', status: 'active' } },
      { upsert: true },
    );
  }

  return { user, token: signToken(user) };
}

export async function registerUser({ name, email, password }) {
  const existing = await User.findOne({ email, deletedAt: null });
  if (existing) {
    const error = new Error('Email is already registered');
    error.status = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ name, email, passwordHash });
  await Subscription.create({ user: user._id, plan: 'free', status: 'active' });
  return { user, token: signToken(user) };
}

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email, deletedAt: null });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }
  return { user, token: signToken(user) };
}

export async function createPasswordReset(email) {
  const user = await User.findOne({ email, deletedAt: null });
  if (!user) return { ok: true };

  const token = crypto.randomBytes(24).toString('hex');
  user.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  return { ok: true, resetToken: token };
}

export async function resetPassword({ token, password }) {
  const passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    passwordResetToken,
    passwordResetExpires: { $gt: new Date() },
    deletedAt: null,
  });

  if (!user) {
    const error = new Error('Reset token is invalid or expired');
    error.status = 422;
    throw error;
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  return { ok: true };
}

export async function updateUserProfile({ user, name, email }) {
  if (email && email !== user.email) {
    const existing = await User.findOne({ email, deletedAt: null });
    if (existing && String(existing._id) !== String(user._id)) {
      const error = new Error('Email is already in use');
      error.status = 409;
      throw error;
    }
    user.email = email;
  }

  if (name) user.name = name;
  await user.save();
  return { user, token: signToken(user) };
}
