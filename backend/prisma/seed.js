import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

const FUNCIONARIOS = [
  { nome: 'Ana Administradora', email: 'admin@overdrive.com', senha: 'Admin@123', perfil: 'ADMINISTRADOR' },
  { nome: 'Rafaela Recepção', email: 'recepcao@overdrive.com', senha: 'Recepcao@123', perfil: 'RECEPCIONISTA' },
  { nome: 'Marcos Mecânico', email: 'mecanico@overdrive.com', senha: 'Mecanico@123', perfil: 'MECANICO' },
];

const CLIENTES = [
  { nome: 'João da Silva', cpf: '11144477735', telefone: '11988887777', email: 'joao.silva@example.com' },
  { nome: 'Maria Oliveira', cpf: '22255588846', telefone: '11977776666', email: 'maria.oliveira@example.com' },
  { nome: 'Carlos Pereira', cpf: '33366699957', telefone: '11966665555', email: 'carlos.pereira@example.com' },
];

const VEICULOS = [
  { placa: 'ABC1234', marca: 'Volkswagen', modelo: 'Gol', ano: 2015, cor: 'Prata', km: 82000, clienteCpf: '11144477735' },
  { placa: 'ABC1D23', marca: 'Fiat', modelo: 'Argo', ano: 2021, cor: 'Branco', km: 31000, clienteCpf: '22255588846' },
  { placa: 'XYZ9876', marca: 'Chevrolet', modelo: 'Onix', ano: 2019, cor: 'Preto', km: 54000, clienteCpf: '22255588846' },
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

async function main() {
  await seedFuncionarios();
  await seedClientes();
  await seedVeiculos();
  console.log('Seed concluído: 3 funcionários, 3 clientes e 3 veículos.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
