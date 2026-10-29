import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as clientesController from './clientes.controller.js';

const router = Router();
const PODE_EDITAR = authorize('RECEPCIONISTA', 'ADMINISTRADOR');

router.use(authenticate);

router.get('/', asyncHandler(clientesController.listar));
router.get('/:id', asyncHandler(clientesController.buscarPorId));
router.post('/', PODE_EDITAR, asyncHandler(clientesController.criar));
router.patch('/:id', PODE_EDITAR, asyncHandler(clientesController.atualizar));
router.patch('/:id/ativo', PODE_EDITAR, asyncHandler(clientesController.definirAtivo));

export default router;
