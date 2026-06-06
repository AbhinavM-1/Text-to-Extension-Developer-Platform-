import { Router } from 'express';
import { completeOAuth, completePasswordReset, forgotPassword, login, me, register, startOAuth, updateProfile } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { forgotPasswordRules, loginRules, profileRules, registerRules, resetPasswordRules, validate } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/forgot-password', forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, completePasswordReset);
router.get('/me', requireAuth, me);
router.patch('/me', requireAuth, profileRules, validate, updateProfile);
router.get('/oauth/:provider/start', startOAuth);
router.get('/oauth/:provider/callback', completeOAuth);

export default router;
