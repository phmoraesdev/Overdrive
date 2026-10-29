import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as veiculosController from './veiculos.controller.js';

const router = Router();
const PODE_EDITAR = authorize('RECEPCIONISTA', 'ADMINISTRADOR');

router.use(authenticate);

router.get('/', asyncHandler(veiculosController.listarPorCliente));
router.get('/:id', asyncHandler(veiculosController.buscarPorId));
router.post('/', PODE_EDITAR, asyncHandler(veiculosController.criar));
router.patch('/:id', PODE_EDITAR, asyncHandler(veiculosController.atualizar));
router.patch('/:id/ativo', PODE_EDITAR, asyncHandler(veiculosController.definirAtivo));
router.patch(
  '/:id/transferir',
  PODE_EDITAR,
  asyncHandler(veiculosController.transferirProprietario),
);

export default router;
