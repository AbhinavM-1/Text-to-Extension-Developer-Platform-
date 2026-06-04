import { Router } from 'express';
import { completeOAuth, forgotPassword, login, me, register, startOAuth } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { loginRules, registerRules, validate } from '../middleware/validate.middleware.js';

const router = Router();

router.post('/register', registerRules, validate, register);
router.post('/login', loginRules, validate, login);
router.post('/forgot-password', forgotPassword);
router.get('/me', requireAuth, me);
router.get('/oauth/:provider/start', startOAuth);
router.get('/oauth/:provider/callback', completeOAuth);

export default router;
