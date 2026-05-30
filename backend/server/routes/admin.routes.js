import { Router } from 'express';
import {
  analytics,
  deleteAnyExtension,
  listAllExtensions,
  listUsers,
  manageSubscription,
} from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/analytics', analytics);
router.get('/users', listUsers);
router.get('/extensions', listAllExtensions);
router.delete('/extensions/:id', deleteAnyExtension);
router.patch('/subscriptions/:userId', manageSubscription);

export default router;
