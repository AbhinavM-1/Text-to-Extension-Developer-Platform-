import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['free', 'pro', 'premium'], default: 'free' },
  status: { type: String, enum: ['active', 'past_due', 'canceled'], default: 'active' },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  paymentMethod: { type: String, enum: ['free', 'upi', 'card', 'netbanking'], default: 'free' },
  amount: { type: Number, default: 0 },
  currency: { type: String, default: 'INR' },
  paymentReference: String,
  lastPaidAt: Date,
  renewsAt: Date,
}, { timestamps: true });

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
