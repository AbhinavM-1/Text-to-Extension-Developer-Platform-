import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

export const registerRules = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8, max: 128 }),
];

export const loginRules = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1 }),
];

export const forgotPasswordRules = [
  body('email').isEmail().normalizeEmail(),
];

export const resetPasswordRules = [
  body('token').isString().isLength({ min: 20, max: 200 }),
  body('password').isLength({ min: 8, max: 128 }),
];

export const profileRules = [
  body('name').trim().isLength({ min: 2, max: 80 }),
  body('email').isEmail().normalizeEmail(),
];

export const promptRules = [
  body('prompt')
    .isString()
    .isLength({ min: 10, max: 4000 })
    .customSanitizer(value => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim()),
];

export const editRules = [
  body('editPrompt')
    .isString()
    .isLength({ min: 3, max: 2000 })
    .customSanitizer(value => sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim()),
];

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ message: 'Validation failed', errors: errors.array() });
  next();
}

export function validateObjectIdParam(paramName = 'id') {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      return res.status(400).json({ message: `Invalid ${paramName}` });
    }
    next();
  };
}
