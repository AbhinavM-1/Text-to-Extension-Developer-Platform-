import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
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
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
