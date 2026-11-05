import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as dashboardController from './dashboard.controller.js';

const router = Router();

router.use(authenticate);

// Sem authorize() fixo: os três perfis podem chamar — o que muda é o
// conteúdo da resposta, decidido em dashboard.service.js#montar.
router.get('/', asyncHandler(dashboardController.obter));

export default router;
