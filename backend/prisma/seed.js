import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import * as ordensService from '../src/modules/ordens/ordens.service.js';
import * as agendaService from '../src/modules/agenda/agenda.service.js';
import * as financeiroService from '../src/modules/financeiro/financeiro.service.js';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

function gerarCpf(base) {
  function digito(b) {
    let soma = 0;
    let peso = b.length + 1;
    for (const d of b) {
      soma += Number(d) * peso;
      peso -= 1;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }
  const digito1 = digito(base);
  const digito2 = digito(base + digito1);
  return `${base}${digito1}${digito2}`;
}

function diasAPartirDeHoje(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data;
}

const FUNCIONARIOS = [
  { nome: 'Ana Administradora', email: 'admin@overdrive.com', senha: 'Admin@123', perfil: 'ADMINISTRADOR' },
  { nome: 'Rafaela Recepção', email: 'recepcao@overdrive.com', senha: 'Recepcao@123', perfil: 'RECEPCIONISTA' },
  { nome: 'Marcos Mecânico', email: 'mecanico@overdrive.com', senha: 'Mecanico@123', perfil: 'MECANICO' },
  { nome: 'Bruno Borracheiro', email: 'bruno@overdrive.com', senha: 'Bruno@123', perfil: 'MECANICO' },
];

const CLIENTES = [
  { nome: 'João da Silva', cpf: '11144477735', telefone: '11988887777', email: 'joao.silva@example.com' },
  { nome: 'Maria Oliveira', cpf: '22255588846', telefone: '11977776666', email: 'maria.oliveira@example.com' },
  { nome: 'Carlos Pereira', cpf: '33366699957', telefone: '11966665555', email: 'carlos.pereira@example.com' },
  {
    nome: 'Fernanda Costa',
    cpf: gerarCpf('444555666'),
    telefone: '11955554444',
    email: 'fernanda.costa@example.com',
  },
  {
    nome: 'Ricardo Almeida',
    cpf: gerarCpf('777888111'),
    telefone: '11944443333',
    email: 'ricardo.almeida@example.com',
  },
  {
    nome: 'Juliana Santos',
    cpf: gerarCpf('321654987'),
    telefone: '11933332222',
    email: 'juliana.santos@example.com',
  },
];

const VEICULOS = [
  { placa: 'ABC1234', marca: 'Volkswagen', modelo: 'Gol', ano: 2015, cor: 'Prata', km: 82000, clienteCpf: '11144477735' },
  { placa: 'ABC1D23', marca: 'Fiat', modelo: 'Argo', ano: 2021, cor: 'Branco', km: 31000, clienteCpf: '22255588846' },
  { placa: 'XYZ9876', marca: 'Chevrolet', modelo: 'Onix', ano: 2019, cor: 'Preto', km: 54000, clienteCpf: '22255588846' },
  { placa: 'JJS2D45', marca: 'Hyundai', modelo: 'HB20', ano: 2020, cor: 'Vermelho', km: 41000, clienteCpf: '33366699957' },
  { placa: 'DEF5566', marca: 'Honda', modelo: 'Civic', ano: 2017, cor: 'Preto', km: 68000, clienteCpf: '33366699957' },
  { placa: 'FCO8899', marca: 'Toyota', modelo: 'Corolla', ano: 2022, cor: 'Prata', km: 18000, clienteCpf: gerarCpf('444555666') },
  { placa: 'RAL4321', marca: 'Renault', modelo: 'Kwid', ano: 2019, cor: 'Branco', km: 37000, clienteCpf: gerarCpf('777888111') },
  { placa: 'JUS7788', marca: 'Jeep', modelo: 'Renegade', ano: 2021, cor: 'Azul', km: 25000, clienteCpf: gerarCpf('321654987') },
];

const PECAS = [
  { codigo: 'FTR-OLEO-001', descricao: 'Filtro de óleo', precoCusto: 18, precoVenda: 35, quantidade: 25, quantidadeMinima: 5 },
  { codigo: 'FTR-AR-002', descricao: 'Filtro de ar', precoCusto: 22, precoVenda: 42, quantidade: 15, quantidadeMinima: 5 },
  { codigo: 'PST-FRE-010', descricao: 'Pastilha de freio dianteira', precoCusto: 60, precoVenda: 120, quantidade: 3, quantidadeMinima: 4 },
  { codigo: 'OLEO-5W30-01', descricao: 'Óleo de motor 5W30 (litro)', precoCusto: 25, precoVenda: 48, quantidade: 40, quantidadeMinima: 10 },
];

async function seedFuncionarios() {
  for (const funcionario of FUNCIONARIOS) {
    const senhaHash = await bcrypt.hash(funcionario.senha, SALT_ROUNDS);
    await prisma.funcionario.upsert({
      where: { email: funcionario.email },
      update: {},
      create: {
        nome: funcionario.nome,
        email: funcionario.email,
        senhaHash,
        perfil: funcionario.perfil,
      },
    });
  }
}

async function seedClientes() {
  for (const cliente of CLIENTES) {
    await prisma.cliente.upsert({
      where: { cpf: cliente.cpf },
      update: {},
      create: cliente,
    });
  }
}

async function seedVeiculos() {
  for (const veiculo of VEICULOS) {
    const cliente = await prisma.cliente.findUnique({ where: { cpf: veiculo.clienteCpf } });
    await prisma.veiculo.upsert({
      where: { placa: veiculo.placa },
      update: {},
      create: {
        placa: veiculo.placa,
        marca: veiculo.marca,
        modelo: veiculo.modelo,
        ano: veiculo.ano,
        cor: veiculo.cor,
        km: veiculo.km,
        clienteId: cliente.id,
      },
    });
  }
}

async function seedPecas() {
  for (const peca of PECAS) {
    await prisma.peca.upsert({
      where: { codigo: peca.codigo },
      update: {},
      create: peca,
    });
  }
}

// --- Fluxo de demonstração (PB23) --------------------------------------
//
// Abre e conduz várias OS pelo ciclo completo usando a própria camada de
// service (não cria registros "na mão" direto no banco), para garantir que
// os dados de demonstração respeitem as mesmas regras de negócio de um uso
// real: numeração sequencial, checklist obrigatório, orçamento calculado no
// backend, transições de status válidas, baixa de estoque etc.
//
// Só roda se ainda não existir nenhuma OS no banco — assim, rodar o seed de
// novo (ex.: depois de um `prisma migrate reset`) não fica empilhando OS de
// demonstração duplicadas a cada execução.

async function buscarContexto() {
  const [admin, recepcao, marcos, bruno, clientes, veiculos, pecas] = await Promise.all([
    prisma.funcionario.findUniqueOrThrow({ where: { email: 'admin@overdrive.com' } }),
    prisma.funcionario.findUniqueOrThrow({ where: { email: 'recepcao@overdrive.com' } }),
    prisma.funcionario.findUniqueOrThrow({ where: { email: 'mecanico@overdrive.com' } }),
    prisma.funcionario.findUniqueOrThrow({ where: { email: 'bruno@overdrive.com' } }),
    prisma.cliente.findMany(),
    prisma.veiculo.findMany(),
    prisma.peca.findMany(),
  ]);

  const clientePorCpf = Object.fromEntries(clientes.map((c) => [c.cpf, c]));
  const veiculoPorPlaca = Object.fromEntries(veiculos.map((v) => [v.placa, v]));
  const pecaPorCodigo = Object.fromEntries(pecas.map((p) => [p.codigo, p]));

  return { admin, recepcao, marcos, bruno, clientePorCpf, veiculoPorPlaca, pecaPorCodigo };
}

async function abrirOS({ veiculo, abertaPorId, kmEntrada, problemaRelatado, checklist }) {
  return ordensService.abrir(
    { veiculoId: veiculo.id, kmEntrada, problemaRelatado, checklist, ignorarAvisos: true },
    abertaPorId,
  );
}

async function montarOrcamento(ordemServicoId, itens) {
  const resultados = [];
  for (const item of itens) {
    const resultado = await ordensService.adicionarItemOrcamento(ordemServicoId, item);
    resultados.push(resultado.item);
  }
  return resultados;
}

async function seedFluxoDemonstracao() {
  const totalOrdens = await prisma.ordemServico.count();
  if (totalOrdens > 0) {
    console.log('Já existem OS no banco — pulando o fluxo de demonstração.');
    return;
  }

  const ctx = await buscarContexto();
  const checklistPadrao = {
    nivelCombustivel: 'MEIO',
    itensPresentes: ['Estepe', 'Macaco', 'Triângulo'],
  };

  // OS-A: recém-aberta, ainda sem orçamento (Aberta).
  await abrirOS({
    veiculo: ctx.veiculoPorPlaca['ABC1234'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 82150,
    problemaRelatado: 'Barulho estranho ao frear e ao fazer curvas.',
    checklist: {
      ...checklistPadrao,
      avarias: [{ regiao: 'Para-choque dianteiro', descricao: 'Risco superficial' }],
    },
  });

  // OS-B: orçamento montado e finalizado, aguardando a decisão do cliente.
  const osB = await abrirOS({
    veiculo: ctx.veiculoPorPlaca['ABC1D23'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 31200,
    problemaRelatado: 'Troca de óleo e filtro — revisão programada.',
    checklist: checklistPadrao,
  });
  await montarOrcamento(osB.id, [
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['OLEO-5W30-01'].id, quantidade: 4 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Troca de óleo e filtro', quantidade: 1, valorUnitario: 80 },
  ]);
  await ordensService.finalizarOrcamento(osB.id, ctx.marcos.id);

  // OS-C: orçamento aprovado parcialmente (a pastilha de freio foi recusada
  // pelo cliente) — mostra o recálculo do total aprovado.
  const osC = await abrirOS({
    veiculo: ctx.veiculoPorPlaca['XYZ9876'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 54300,
    problemaRelatado: 'Pedal de freio meio esponjoso e ar-condicionado fraco.',
    checklist: checklistPadrao,
  });
  const itensC = await montarOrcamento(osC.id, [
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['PST-FRE-010'].id, quantidade: 2 },
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['FTR-AR-002'].id, quantidade: 1 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Revisão geral do sistema de freios', quantidade: 1, valorUnitario: 150 },
  ]);
  await ordensService.finalizarOrcamento(osC.id, ctx.bruno.id);
  await ordensService.registrarDecisao(
    osC.id,
    {
      decisao: 'APROVADO_PARCIAL',
      meioContato: 'WHATSAPP',
      itensAprovadosIds: [itensC[1].id, itensC[2].id],
    },
    ctx.recepcao.id,
  );

  // OS-D: já em execução, aguardando a chegada de uma peça.
  const osD = await abrirOS({
    veiculo: ctx.veiculoPorPlaca['JJS2D45'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 41050,
    problemaRelatado: 'Luz de óleo acesa no painel.',
    checklist: checklistPadrao,
  });
  await montarOrcamento(osD.id, [
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['FTR-OLEO-001'].id, quantidade: 1 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Diagnóstico e troca de filtro', quantidade: 1, valorUnitario: 100 },
  ]);
  await ordensService.finalizarOrcamento(osD.id, ctx.marcos.id);
  await ordensService.registrarDecisao(
    osD.id,
    { decisao: 'APROVADO', meioContato: 'TELEFONE' },
    ctx.recepcao.id,
  );
  await ordensService.atualizarStatus(osD.id, 'AGUARDANDO_PECA', ctx.marcos.id);

  // OS-E: pronta para retirada — já disparou a notificação ao cliente.
  const osE = await abrirOS({
    veiculo: ctx.veiculoPorPlaca['DEF5566'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 68200,
    problemaRelatado: 'Revisão completa antes de viagem.',
    checklist: checklistPadrao,
  });
  await montarOrcamento(osE.id, [
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['FTR-OLEO-001'].id, quantidade: 2 },
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['OLEO-5W30-01'].id, quantidade: 4 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Troca de óleo completa', quantidade: 1, valorUnitario: 90 },
  ]);
  await ordensService.finalizarOrcamento(osE.id, ctx.bruno.id);
  await ordensService.registrarDecisao(
    osE.id,
    { decisao: 'APROVADO', meioContato: 'PRESENCIAL' },
    ctx.recepcao.id,
  );
  await ordensService.atualizarStatus(osE.id, 'PRONTO_PARA_RETIRADA', ctx.bruno.id);

  // OS-F: encerrada, pagamento à vista — já tem recibo disponível.
  const osF = await abrirOS({
    veiculo: ctx.veiculoPorPlaca['FCO8899'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 18150,
    problemaRelatado: 'Ar-condicionado não gela direito.',
    checklist: checklistPadrao,
  });
  await montarOrcamento(osF.id, [
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['FTR-AR-002'].id, quantidade: 2 },
    { tipo: 'MAO_DE_OBRA', descricao: 'Limpeza do sistema de arrefecimento', quantidade: 1, valorUnitario: 120 },
  ]);
  await ordensService.finalizarOrcamento(osF.id, ctx.marcos.id);
  await ordensService.registrarDecisao(
    osF.id,
    { decisao: 'APROVADO', meioContato: 'WHATSAPP' },
    ctx.recepcao.id,
  );
  await ordensService.atualizarStatus(osF.id, 'PRONTO_PARA_RETIRADA', ctx.marcos.id);
  await ordensService.encerrar(osF.id, { formaPagamento: 'PIX' }, ctx.recepcao.id);

  // OS-G: encerrada, pagamento parcelado em 3x no cartão.
  const osG = await abrirOS({
    veiculo: ctx.veiculoPorPlaca['RAL4321'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 37200,
    problemaRelatado: 'Barulho forte na suspensão dianteira.',
    checklist: checklistPadrao,
  });
  await montarOrcamento(osG.id, [
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['PST-FRE-010'].id, quantidade: 1 },
    {
      tipo: 'MAO_DE_OBRA',
      descricao: 'Troca de pastilhas de freio e revisão de suspensão',
      quantidade: 1,
      valorUnitario: 350,
    },
  ]);
  await ordensService.finalizarOrcamento(osG.id, ctx.bruno.id);
  await ordensService.registrarDecisao(
    osG.id,
    { decisao: 'APROVADO', meioContato: 'TELEFONE' },
    ctx.recepcao.id,
  );
  await ordensService.atualizarStatus(osG.id, 'PRONTO_PARA_RETIRADA', ctx.bruno.id);
  await ordensService.encerrar(
    osG.id,
    { formaPagamento: 'CARTAO', parcelado: true, numeroParcelas: 3 },
    ctx.recepcao.id,
  );

  // OS-H: orçamento reprovado pelo cliente — fica parada aí (estado final).
  const osH = await abrirOS({
    veiculo: ctx.veiculoPorPlaca['JUS7788'],
    abertaPorId: ctx.recepcao.id,
    kmEntrada: 25100,
    problemaRelatado: 'Barulho no motor ao acelerar.',
    checklist: checklistPadrao,
  });
  await montarOrcamento(osH.id, [
    { tipo: 'MAO_DE_OBRA', descricao: 'Diagnóstico de barulho no motor', quantidade: 1, valorUnitario: 80 },
    { tipo: 'PECA', pecaId: ctx.pecaPorCodigo['OLEO-5W30-01'].id, quantidade: 1 },
  ]);
  await ordensService.finalizarOrcamento(osH.id, ctx.marcos.id);
  await ordensService.registrarDecisao(
    osH.id,
    { decisao: 'REPROVADO', meioContato: 'TELEFONE', motivo: 'Cliente vai levar em outra oficina.' },
    ctx.recepcao.id,
  );

  console.log('Fluxo de demonstração: 8 OS criadas (Aberta, Aguardando aprovação,');
  console.log('aprovação parcial, Aguardando peça, Pronto, 2 Encerradas e 1 Reprovada).');

  return ctx;
}

async function seedAgenda(ctx) {
  const totalAgendamentos = await prisma.agendamento.count();
  if (totalAgendamentos > 0) return;

  const hoje10h = diasAPartirDeHoje(0);
  hoje10h.setHours(10, 0, 0, 0);
  const hoje14h = diasAPartirDeHoje(0);
  hoje14h.setHours(14, 0, 0, 0);
  const amanha9h = diasAPartirDeHoje(1);
  amanha9h.setHours(9, 0, 0, 0);

  await agendaService.criar({
    dataHora: hoje10h,
    clienteId: ctx.clientePorCpf['11144477735'].id,
    veiculoId: ctx.veiculoPorPlaca['ABC1234'].id,
    observacoes: 'Cliente quer saber se precisa trocar os pneus também.',
  });
  await agendaService.criar({
    dataHora: hoje14h,
    clienteId: ctx.clientePorCpf['22255588846'].id,
  });
  await agendaService.criar({
    dataHora: amanha9h,
    clienteId: ctx.clientePorCpf['33366699957'].id,
    veiculoId: ctx.veiculoPorPlaca['DEF5566'].id,
  });

  console.log('Agenda: 3 atendimentos de demonstração (hoje e amanhã).');
}

async function seedFinanceiro() {
  // Conta tem registros gerados automaticamente pelo encerramento de OS
  // (ordemServicoId preenchido) — o guard de idempotência precisa olhar só
  // para as contas manuais (ordemServicoId nulo), senão as 2 contas que o
  // próprio seedFluxoDemonstracao() já criou via encerrar() fariam esta
  // função achar que "já tem conta" e pular as contas manuais de propósito.
  const totalContasManuais = await prisma.conta.count({ where: { ordemServicoId: null } });
  if (totalContasManuais > 0) return;

  await financeiroService.criar({
    tipo: 'PAGAR',
    fornecedor: 'Distribuidora de Peças Central',
    descricao: 'Reposição de estoque do mês',
    valor: 850,
    vencimento: diasAPartirDeHoje(15),
  });

  // Fica ABERTA e vencida de propósito, para aparecer no alerta do financeiro.
  await financeiroService.criar({
    tipo: 'PAGAR',
    fornecedor: 'Imobiliária Pátio Oficinas',
    descricao: 'Aluguel do galpão',
    valor: 2200,
    vencimento: diasAPartirDeHoje(-5),
  });

  const contaPaga = await financeiroService.criar({
    tipo: 'PAGAR',
    fornecedor: 'Companhia de Energia Elétrica',
    descricao: 'Conta de luz',
    valor: 430,
    vencimento: diasAPartirDeHoje(-10),
  });
  await financeiroService.baixar(contaPaga.id, { valorPago: 430, pagaEm: diasAPartirDeHoje(-8) });

  console.log('Financeiro: 3 contas a pagar de demonstração (1 vencida, 1 já paga).');
}

async function main() {
  await seedFuncionarios();
  await seedClientes();
  await seedVeiculos();
  await seedPecas();
  console.log('Base: 4 funcionários, 6 clientes, 8 veículos e 4 peças.');

  const ctx = await seedFluxoDemonstracao();
  if (ctx) {
    await seedAgenda(ctx);
  }
  await seedFinanceiro();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
