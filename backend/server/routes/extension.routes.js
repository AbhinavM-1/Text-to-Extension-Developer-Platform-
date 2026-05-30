import { Router } from 'express';
import {
  deleteExtension,
  editExtension,
  generateExtension,
  getExtension,
  listExtensions,
  scanExtension,
} from '../controllers/extension.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { enforceGenerationQuota, requirePremiumForApiExtensions } from '../middleware/subscription.middleware.js';
import { editRules, promptRules, validate } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/', listExtensions);
router.post('/generate', promptRules, validate, enforceGenerationQuota, requirePremiumForApiExtensions, generateExtension);
router.get('/:id', getExtension);
router.post('/:id/edit', editRules, validate, enforceGenerationQuota, requirePremiumForApiExtensions, editExtension);
router.post('/:id/security-scan', scanExtension);
router.delete('/:id', deleteExtension);

export default router;
