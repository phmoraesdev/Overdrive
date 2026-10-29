import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as agendaController from './agenda.controller.js';

const router = Router();
const PODE_EDITAR = authorize('RECEPCIONISTA', 'ADMINISTRADOR');

router.use(authenticate);

router.get('/', asyncHandler(agendaController.listarPorDia));
router.post('/', PODE_EDITAR, asyncHandler(agendaController.criar));
router.patch('/:id/reagendar', PODE_EDITAR, asyncHandler(agendaController.reagendar));
router.patch('/:id/cancelar', PODE_EDITAR, asyncHandler(agendaController.cancelar));

export default router;
