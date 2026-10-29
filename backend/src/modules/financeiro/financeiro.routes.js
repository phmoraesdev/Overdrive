import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as financeiroController from './financeiro.controller.js';

const router = Router();

router.use(authenticate, authorize('ADMINISTRADOR'));

// Precisa vir antes de '/:id' para não ser interpretada como um id.
router.get('/fluxo-caixa', asyncHandler(financeiroController.fluxoCaixa));

router.get('/', asyncHandler(financeiroController.listar));
router.get('/:id', asyncHandler(financeiroController.buscarPorId));
router.post('/', asyncHandler(financeiroController.criar));
router.patch('/:id', asyncHandler(financeiroController.atualizar));
router.delete('/:id', asyncHandler(financeiroController.remover));
router.patch('/:id/baixa', asyncHandler(financeiroController.baixar));

export default router;
