import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
  status: { type: String, enum: ['active', 'past_due', 'canceled'], default: 'active' },
  renewsAt: Date,
}, { timestamps: true });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
