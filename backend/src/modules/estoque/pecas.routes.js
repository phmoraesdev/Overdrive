import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as pecasController from './pecas.controller.js';

const router = Router();
const SOMENTE_ADMIN = authorize('ADMINISTRADOR');

router.use(authenticate);

router.get('/', asyncHandler(pecasController.listar));
router.get('/alertas', SOMENTE_ADMIN, asyncHandler(pecasController.listarEmAlerta));
router.get('/:id', asyncHandler(pecasController.buscarPorId));
router.post('/', SOMENTE_ADMIN, asyncHandler(pecasController.criar));
router.patch('/:id', SOMENTE_ADMIN, asyncHandler(pecasController.atualizar));
router.patch('/:id/ativo', SOMENTE_ADMIN, asyncHandler(pecasController.definirAtivo));

export default router;
