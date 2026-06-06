import mongoose from 'mongoose';

const generatedFileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: false });

const versionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  prompt: { type: String, required: true },
  editRequest: { type: Boolean, default: false },
  files: [generatedFileSchema],
  zipPath: String,
  zipUrl: String,
  securityScan: {
    score: Number,
    findings: [{ severity: String, file: String, message: String }],
  },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const extensionSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  prompt: { type: String, required: true },
  files: [generatedFileSchema],
  zipPath: String,
  zipUrl: String,
  versionHistory: [versionSchema],
  deletedAt: { type: Date, default: null, index: true },
}, { timestamps: true });

extensionSchema.index({ name: 'text', description: 'text', prompt: 'text' });
extensionSchema.index({ owner: 1, deletedAt: 1, updatedAt: -1 });

export const Extension = mongoose.model('Extension', extensionSchema);
