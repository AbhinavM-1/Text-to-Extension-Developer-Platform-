import { Router } from 'express';
import {
  checkoutSubscription,
  createPaymentOrder,
  getPaymentConfig,
  getSubscription,
  handleRazorpayWebhook,
  listPayments,
  updateSubscription,
  verifyPayment,
} from '../controllers/subscription.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/webhook', handleRazorpayWebhook);

router.use(requireAuth);
router.get('/payment-config', getPaymentConfig);
router.get('/me', getSubscription);
router.get('/payments', listPayments);
router.patch('/me', updateSubscription);
router.post('/checkout', checkoutSubscription);
router.post('/create-order', createPaymentOrder);
router.post('/verify-payment', verifyPayment);

export default router;
