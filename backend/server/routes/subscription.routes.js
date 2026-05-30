import { Router } from 'express';
import { getSubscription, updateSubscription } from '../controllers/subscription.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/me', getSubscription);
router.patch('/me', updateSubscription);

export default router;
