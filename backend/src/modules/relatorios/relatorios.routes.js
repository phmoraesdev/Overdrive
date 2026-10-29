import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as relatoriosController from './relatorios.controller.js';

const router = Router();

router.use(authenticate, authorize('ADMINISTRADOR'));

router.get('/faturamento', asyncHandler(relatoriosController.faturamento));
router.get('/desempenho', asyncHandler(relatoriosController.desempenho));

export default router;
