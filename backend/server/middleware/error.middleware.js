import { logger } from '../services/logger.service.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, req, res, next) {
  const status = error.status || 500;
  const message = status === 500 ? 'Unexpected server error' : error.message;
  if (status === 500) {
    logger.error('Unhandled API error', {
      method: req.method,
      path: req.originalUrl,
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    });
  }
  res.status(status).json({ message, details: error.details });
}
