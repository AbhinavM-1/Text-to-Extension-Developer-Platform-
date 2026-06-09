import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
  plan: { type: String, enum: ['pro', 'premium'], required: true },
  billingCycle: { type: String, enum: ['monthly', 'yearly'], required: true },
  paymentMethod: { type: String, enum: ['upi', 'card', 'netbanking'], required: true },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed', 'cancelled'],
    default: 'created',
    index: true,
  },
  amount: { type: Number, required: true, min: 1 },
  amountPaise: { type: Number, required: true, min: 100 },
  currency: { type: String, default: 'INR' },
  receipt: { type: String, required: true, unique: true },
  razorpayOrderId: { type: String, required: true, unique: true },
  razorpayPaymentId: { type: String, index: true },
  razorpaySignature: String,
  failureReason: String,
  rawOrder: mongoose.Schema.Types.Mixed,
  rawPayment: mongoose.Schema.Types.Mixed,
  paidAt: Date,
}, { timestamps: true });

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ razorpayOrderId: 1, user: 1 });

export const Payment = mongoose.model('Payment', paymentSchema);
