import { logger } from '../services/logger.service.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || error.statusCode || 500;
  const isPaymentRoute = req.originalUrl?.startsWith('/api/subscriptions');
  const message = status === 500 && !isPaymentRoute ? 'Unexpected server error' : error.message;

  logger[status >= 500 ? 'error' : 'warn']('API request failed', {
    method: req.method,
    path: req.originalUrl,
    status,
    error: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
  });

  res.status(status).json({ message, details: error.details });
}
