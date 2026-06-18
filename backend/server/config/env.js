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
