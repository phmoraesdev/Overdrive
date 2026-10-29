import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { asyncHandler } from '../../shared/asyncHandler.js';
import * as ordensController from './ordens.controller.js';

const router = Router();
const PODE_ABRIR = authorize('RECEPCIONISTA', 'ADMINISTRADOR');
const PODE_ORCAR = authorize('MECANICO', 'ADMINISTRADOR');
const PODE_EXECUTAR = authorize('MECANICO', 'ADMINISTRADOR');

router.use(authenticate);

// Rotas estáticas precisam vir antes de '/:id' para não serem interpretadas
// como um id.
router.get('/buscar-veiculo', PODE_ABRIR, asyncHandler(ordensController.buscarParaAbertura));
router.get('/painel', asyncHandler(ordensController.listarPainel));

// Histórico por placa (RF04/PB09): recepção, mecânico e administrador podem
// consultar, só a autenticação é exigida.
router.get('/', asyncHandler(ordensController.listarPorPlaca));
router.post('/', PODE_ABRIR, asyncHandler(ordensController.abrir));

router.get('/:id', asyncHandler(ordensController.buscarPorId));

// PB11: orçamento
router.get('/:id/orcamento', asyncHandler(ordensController.listarOrcamento));
router.post(
  '/:id/orcamento/itens',
  PODE_ORCAR,
  asyncHandler(ordensController.adicionarItemOrcamento),
);
router.patch(
  '/:id/orcamento/itens/:itemId',
  PODE_ORCAR,
  asyncHandler(ordensController.atualizarItemOrcamento),
);
router.delete(
  '/:id/orcamento/itens/:itemId',
  PODE_ORCAR,
  asyncHandler(ordensController.removerItemOrcamento),
);
router.post(
  '/:id/orcamento/finalizar',
  PODE_ORCAR,
  asyncHandler(ordensController.finalizarOrcamento),
);

// PB12: decisão do cliente sobre o orçamento
router.post('/:id/decisao', PODE_ABRIR, asyncHandler(ordensController.registrarDecisao));

// PB13: status da OS (painel Kanban do mecânico)
router.patch('/:id/status', PODE_EXECUTAR, asyncHandler(ordensController.atualizarStatus));

// PB16 + PB17: encerramento com pagamento e baixa automática de estoque
router.post('/:id/encerrar', PODE_ABRIR, asyncHandler(ordensController.encerrar));
router.get('/:id/recibo', asyncHandler(ordensController.gerarRecibo));

// PB14: notificações enviadas ao cliente
router.get('/:id/notificacoes', asyncHandler(ordensController.listarNotificacoes));

export default router;
