const REQUIRED_IN_PRODUCTION = [
  'MONGODB_URI',
  'JWT_SECRET',
  'CLIENT_ORIGIN',
  'API_PUBLIC_URL',
];

const SECRET_MIN_LENGTH = 24;

export function validateRuntimeEnv(env = process.env) {
  const warnings = [];
  const errors = [];
  const isProduction = env.NODE_ENV === 'production';

  if (isProduction) {
    REQUIRED_IN_PRODUCTION.forEach((key) => {
      if (!env[key]) errors.push(`${key} is required in production`);
    });
  }

  if (!env.JWT_SECRET || env.JWT_SECRET === 'dev-secret-change-me' || env.JWT_SECRET.length < SECRET_MIN_LENGTH) {
    const message = `JWT_SECRET should be at least ${SECRET_MIN_LENGTH} characters and unique per environment`;
    if (isProduction) errors.push(message);
    else warnings.push(message);
  }

  if (!env.GROQ_API_KEY) {
    warnings.push('GROQ_API_KEY is missing, AI generation will fail until it is configured');
  }

  if ((env.RAZORPAY_KEY_ID && !env.RAZORPAY_KEY_SECRET) || (!env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)) {
    errors.push('Both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured together');
  }

  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET && !env.RAZORPAY_WEBHOOK_SECRET) {
    warnings.push('RAZORPAY_WEBHOOK_SECRET is missing; checkout verification works, but webhook recovery is disabled');
  }

  const smtpValues = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].filter(key => env[key]);
  if (smtpValues.length > 0 && smtpValues.length < 5) {
    errors.push('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and MAIL_FROM must be configured together');
  }
  if (smtpValues.length === 0) {
    warnings.push('SMTP email is not configured; password reset emails cannot be delivered');
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function assertRuntimeEnv(env = process.env) {
  const result = export(env);
  if (!result.ok) {
    const error = new Error(`export runtime configuration: ${result.errors.join('; ')}`);
    error.details = result.export;
    throw error;
  }
  return result;
}
