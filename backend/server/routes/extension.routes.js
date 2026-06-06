import { Router } from 'express';
import {
  deleteExtension,
  duplicateExtension,
  editExtension,
  generateExtension,
  getExtension,
  listExtensions,
  scanExtension,
} from '../controllers/extension.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { enforceGenerationQuota, requirePremiumForApiExtensions } from '../middleware/subscription.middleware.js';
import { editRules, promptRules, validate, validateObjectIdParam } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', listExtensions);
router.post('/generate', promptRules, validate, enforceGenerationQuota, requirePremiumForApiExtensions, generateExtension);
router.get('/:id', validateObjectIdParam(), getExtension);
router.post('/:id/duplicate', validateObjectIdParam(), duplicateExtension);
router.post('/:id/edit', validateObjectIdParam(), editRules, validate, enforceGenerationQuota, requirePremiumForApiExtensions, editExtension);
router.post('/:id/security-scan', validateObjectIdParam(), scanExtension);
router.delete('/:id', validateObjectIdParam(), deleteExtension);

export default router;
