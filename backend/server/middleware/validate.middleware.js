import { body, validationResult } from 'express-validator';
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
