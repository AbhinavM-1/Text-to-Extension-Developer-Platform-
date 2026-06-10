import { Router } from 'express';
import { getMyActivity } from '../controllers/activity.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/me', getMyActivity);

export default router;
