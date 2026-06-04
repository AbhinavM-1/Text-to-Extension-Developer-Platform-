import { Router } from 'express';
import {
  checkoutSubscription,
  createPaymentOrder,
  getSubscription,
  updateSubscription,
  verifyPayment,
} from '../controllers/subscription.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.use(requireAuth);
router.get('/me', getSubscription);
router.patch('/me', updateSubscription);
router.post('/checkout', checkoutSubscription);
router.post('/create-order', createPaymentOrder);
router.post('/verify-payment', verifyPayment);

export default router;
