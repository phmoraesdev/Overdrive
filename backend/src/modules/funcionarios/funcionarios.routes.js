import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as funcionariosController from './funcionarios.controller.js';

const router = Router();

router.use(authenticate, authorize('ADMINISTRADOR'));

router.get('/', asyncHandler(funcionariosController.listar));
router.get('/:id', asyncHandler(funcionariosController.buscarPorId));
router.post('/', asyncHandler(funcionariosController.criar));
router.patch('/:id', asyncHandler(funcionariosController.atualizar));
router.patch('/:id/ativo', asyncHandler(funcionariosController.definirAtivo));

export default router;
