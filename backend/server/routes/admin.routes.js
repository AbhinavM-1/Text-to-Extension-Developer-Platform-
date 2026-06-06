import { Router } from 'express';
import {
  analytics,
  deleteAnyExtension,
  deleteUser,
  listAllExtensions,
  listUsers,
  manageSubscription,
} from '../controllers/admin.controller.js';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware.js';
import { validateObjectIdParam } from '../middleware/validate.middleware.js';

const router = Router();

router.use(requireAuth, requireAdmin);
router.get('/analytics', analytics);
router.get('/users', listUsers);
router.get('/extensions', listAllExtensions);
router.delete('/users/:id', validateObjectIdParam(), deleteUser);
router.delete('/extensions/:id', validateObjectIdParam(), deleteAnyExtension);
router.patch('/subscriptions/:userId', validateObjectIdParam('userId'), manageSubscription);

export default router;
