import mongoose from 'mongoose';
import { logger } from '../services/logger.service.js';

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/extensio_ai';

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    logger.info('MongoDB connected');
  } catch (error) {
    logger.error('MongoDB connection failed', { error: error.message });
    throw error;
  }
}
