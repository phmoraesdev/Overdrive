import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/login', asyncHandler(authController.login));
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);

export default router;
