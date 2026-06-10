import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: {
    type: String,
    enum: [
      'extension.generated',
      'extension.edited',
      'extension.duplicated',
      'extension.deleted',
      'extension.scanned',
      'subscription.checkout',
      'subscription.payment_created',
      'subscription.payment_verified',
    ],
    required: true,
    index: true,
  },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

activitySchema.index({ user: 1, createdAt: -1 });

export const Activity = mongoose.model('Activity', activitySchema);
