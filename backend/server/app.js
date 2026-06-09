import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import extensionRoutes from './routes/extension.routes.js';
import adminRoutes from './routes/admin.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { validateRuntimeEnv } from './config/env.js';
import { logger } from './services/logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');

export function createApp() {
  const app = express();
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175',
    ...(process.env.CLIENT_ORIGIN || '')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
  ]);

  app.disable('x-powered-by');
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));
  app.use(compression());
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
  }));
  app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json', limit: '1mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
  }));

  app.use('/downloads', express.static(path.join(backendRoot, 'storage', 'zips')));
  app.get('/health', (req, res) => {
    const runtime = validateRuntimeEnv();
    res.status(runtime.ok ? 200 : 503).json({
      ok: runtime.ok,
      service: 'extensio-api',
      environment: process.env.NODE_ENV || 'development',
      warnings: runtime.warnings,
      errors: runtime.errors,
      uptime: process.uptime(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/extensions', extensionRoutes);
  app.use('/api/subscriptions', subscriptionRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  logger.info('Express app configured', { environment: process.env.NODE_ENV || 'development' });
  return app;
}
