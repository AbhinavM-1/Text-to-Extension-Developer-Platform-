import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  authProvider: { type: String, enum: ['local', 'google', 'github', 'microsoft'], default: 'local' },
  providerId: String,
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  generationUsage: {
    date: { type: String, default: '' },
    count: { type: Number, default: 0 },
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

userSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
userSchema.index({ email: 1, deletedAt: 1 });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
