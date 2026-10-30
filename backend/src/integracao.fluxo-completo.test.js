import { beforeAll, describe, expect, it } from 'vitest';
import bcrypt from 'bcrypt';
import request from 'supertest';
import app from './app.js';
import prisma from './shared/prismaClient.js';

// PB21: teste de integração de ponta a ponta — bate na API real (Express +
// Prisma + SQLite de verdade, por isso precisa do nix-shell no NixOS, igual
// ao app.test.js). Roda contra um banco de teste isolado (prisma/test.db,
// criado do zero a partir das migrations por `test/globalSetup.js`) — nunca
// toca no dev.db usado por `npm run dev`/pelo seed de demonstração.
//
// Não depende do seed (`prisma/seed.js`): cria os próprios funcionários de
// teste no `beforeAll`, com e-mail único por execução, e cliente/veículo/peça
// com valores aleatórios — assim não depende de dados de nenhum outro teste
// nem da ordem em que os testes rodam.
//
// Roteiro:
// 1. Login como recepcionista, mecânico e administrador
// 2. Cadastrar cliente e veículo
// 3. Abrir a OS com checklist
// 4. Montar o orçamento (peça + mão de obra) e finalizar
// 5. Aprovar o orçamento
// 6. Marcar a OS como pronta para retirada (dispara a notificação ao cliente)
// 7. Encerrar com pagamento
// 8. Conferir baixa de estoque, lançamento financeiro, recibo e notificação

const SENHA_TESTE = 'TesteIntegracao@123';
const SUFIXO_EXECUCAO = Math.random().toString(36).slice(2, 8);

function gerarCpfValido() {
  function digitoVerificador(base) {
    let soma = 0;
    let peso = base.length + 1;
    for (const digito of base) {
      soma += Number(digito) * peso;
      peso -= 1;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
  const digito1 = digitoVerificador(base);
  const digito2 = digitoVerificador(base + digito1);
  return `${base}${digito1}${digito2}`;
}

function gerarPlaca() {
  return `OVD${Math.floor(1000 + Math.random() * 9000)}`;
}

function gerarCodigoPeca() {
  return `TESTE-INT-${Math.floor(Math.random() * 1_000_000)}`;
}

async function criarFuncionarioDeTeste(perfil) {
  const email = `integracao.${perfil.toLowerCase()}.${SUFIXO_EXECUCAO}@teste.local`;
  const senhaHash = await bcrypt.hash(SENHA_TESTE, 4); // custo baixo só pra não deixar o teste lento
  await prisma.funcionario.create({
    data: { nome: `Teste ${perfil}`, email, senhaHash, perfil },
  });
  return email;
}

describe('Fluxo completo da OS (integração)', () => {
  let emailRecepcao;
  let emailMecanico;
  let emailAdmin;

  beforeAll(async () => {
    [emailRecepcao, emailMecanico, emailAdmin] = await Promise.all([
      criarFuncionarioDeTeste('RECEPCIONISTA'),
      criarFuncionarioDeTeste('MECANICO'),
      criarFuncionarioDeTeste('ADMINISTRADOR'),
    ]);
  });

  it(
    'cadastra cliente/veículo, abre OS, orça, aprova, executa, encerra com ' +
      'pagamento, baixa estoque e lança no financeiro',
    async () => {
      const recepcao = request.agent(app);
      const mecanico = request.agent(app);
      const admin = request.agent(app);

      const loginRecepcao = await recepcao
        .post('/api/auth/login')
        .send({ email: emailRecepcao, senha: SENHA_TESTE });
      expect(loginRecepcao.status).toBe(200);

      const loginMecanico = await mecanico
        .post('/api/auth/login')
        .send({ email: emailMecanico, senha: SENHA_TESTE });
      expect(loginMecanico.status).toBe(200);

      const loginAdmin = await admin
        .post('/api/auth/login')
        .send({ email: emailAdmin, senha: SENHA_TESTE });
      expect(loginAdmin.status).toBe(200);

      // 2. cliente + veículo
      const respostaCliente = await recepcao.post('/api/clientes').send({
        nome: 'Cliente Teste de Integração',
        cpf: gerarCpfValido(),
        telefone: '11988887777',
      });
      expect(respostaCliente.status).toBe(201);
      const clienteId = respostaCliente.body.id;

      const respostaVeiculo = await recepcao.post('/api/veiculos').send({
        placa: gerarPlaca(),
        marca: 'Fiat',
        modelo: 'Uno',
        ano: 2018,
        clienteId,
      });
      expect(respostaVeiculo.status).toBe(201);
      const veiculoId = respostaVeiculo.body.id;

      // peça com saldo conhecido, criada do zero para o teste
      const respostaPeca = await admin.post('/api/pecas').send({
        codigo: gerarCodigoPeca(),
        descricao: 'Peça de teste de integração',
        precoCusto: 20,
        precoVenda: 40,
        quantidade: 10,
        quantidadeMinima: 2,
      });
      expect(respostaPeca.status).toBe(201);
      const pecaId = respostaPeca.body.id;

      // 3. abrir OS com checklist
      const respostaAbertura = await recepcao.post('/api/ordens').send({
        veiculoId,
        kmEntrada: 10000,
        problemaRelatado: 'Revisão de rotina (teste de integração)',
        checklist: { nivelCombustivel: 'CHEIO', itensPresentes: ['Estepe'] },
      });
      expect(respostaAbertura.status).toBe(201);
      expect(respostaAbertura.body.status).toBe('ABERTA');
      const osId = respostaAbertura.body.id;

      // 4. orçamento: 2x peça + 1x mão de obra, depois finalizar
      const itemPeca = await mecanico.post(`/api/ordens/${osId}/orcamento/itens`).send({
        tipo: 'PECA',
        pecaId,
        quantidade: 2,
      });
      expect(itemPeca.status).toBe(201);
      expect(itemPeca.body.aviso).toBeNull();

      const itemMaoDeObra = await mecanico.post(`/api/ordens/${osId}/orcamento/itens`).send({
        tipo: 'MAO_DE_OBRA',
        descricao: 'Revisão geral',
        quantidade: 1,
        valorUnitario: 150,
      });
      expect(itemMaoDeObra.status).toBe(201);

      const orcamento = await mecanico.get(`/api/ordens/${osId}/orcamento`);
      expect(orcamento.body.total).toBe(230); // 2 x 40 + 150

      const finalizar = await mecanico.post(`/api/ordens/${osId}/orcamento/finalizar`);
      expect(finalizar.status).toBe(200);
      expect(finalizar.body.status).toBe('AGUARDANDO_APROVACAO');

      // 5. aprovação do cliente (recepção)
      const decisao = await recepcao.post(`/api/ordens/${osId}/decisao`).send({
        decisao: 'APROVADO',
        meioContato: 'TELEFONE',
      });
      expect(decisao.status).toBe(200);
      expect(decisao.body.status).toBe('EM_EXECUCAO');

      // 6. execução (mecânico) até pronto para retirada
      const pronto = await mecanico
        .patch(`/api/ordens/${osId}/status`)
        .send({ status: 'PRONTO_PARA_RETIRADA' });
      expect(pronto.status).toBe(200);
      expect(pronto.body.status).toBe('PRONTO_PARA_RETIRADA');
      // o cliente só tem telefone cadastrado — deve ter sido notificado, sem
      // precisar da recepção ligar.
      expect(pronto.body.alertaRecepcao).toBe(false);

      // 7. encerramento com pagamento (recepção)
      const encerrar = await recepcao
        .post(`/api/ordens/${osId}/encerrar`)
        .send({ formaPagamento: 'PIX' });
      expect(encerrar.status).toBe(200);
      expect(encerrar.body.ordemServico.status).toBe('ENCERRADA');
      expect(encerrar.body.conta.valor).toBe('230');
      expect(encerrar.body.conta.status).toBe('PAGA');

      // 8a. baixa automática de estoque (10 - 2 = 8)
      const pecaAtualizada = await admin.get(`/api/pecas/${pecaId}`);
      expect(pecaAtualizada.body.quantidade).toBe(8);

      // 8b. lançamento financeiro criado a partir do encerramento
      const conta = await admin.get(`/api/financeiro/${encerrar.body.conta.id}`);
      expect(conta.status).toBe(200);
      expect(conta.body).toMatchObject({ tipo: 'RECEBER', status: 'PAGA', ordemServicoId: osId });

      // 8c. notificação registrada (provedor simulado)
      const notificacoes = await recepcao.get(`/api/ordens/${osId}/notificacoes`);
      expect(notificacoes.status).toBe(200);
      expect(notificacoes.body.length).toBeGreaterThan(0);
      expect(notificacoes.body.every((notificacao) => notificacao.status === 'ENVIADA')).toBe(true);

      // 8d. recibo em PDF disponível
      const recibo = await recepcao.get(`/api/ordens/${osId}/recibo`);
      expect(recibo.status).toBe(200);
      expect(recibo.headers['content-type']).toBe('application/pdf');
      expect(recibo.body.subarray(0, 4).toString()).toBe('%PDF');

      // 8e. histórico de status completo e em ordem
      const detalhe = await recepcao.get(`/api/ordens/${osId}`);
      const statusHistorico = detalhe.body.historicosStatus.map((h) => h.statusNovo);
      expect(statusHistorico).toEqual([
        'AGUARDANDO_APROVACAO',
        'EM_EXECUCAO',
        'PRONTO_PARA_RETIRADA',
        'ENCERRADA',
      ]);
    },
  );
});
