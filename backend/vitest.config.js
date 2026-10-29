import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      // RNF15/PB21 pede cobertura nas regras de negócio: cálculo do
      // orçamento, baixa de estoque e lançamentos financeiros. Isso vive nos
      // *.service.js (validação, cálculo, orquestração) e nos helpers de
      // dinheiro/exportação/provedores — não nos *.repository.js, que são só
      // wrappers finos do Prisma (sempre a mesma forma: um `prisma.x.y(...)`
      // por função) cobertos pelos testes manuais via curl contra o banco
      // real, não por teste unitário — mesmo critério já usado desde a
      // Sprint 1 para não mockar o Prisma inteiro só para testar uma query.
      // Rotas, controllers (só parsing + repasse) e schemas (declarativos)
      // também ficam de fora pelo mesmo motivo: não é regra de negócio.
      include: [
        'src/modules/**/*.service.js',
        'src/modules/ordens/ordens.recibo.js',
        'src/modules/relatorios/relatorios.exportacao.js',
        'src/modules/notificacoes/notificacoes.provedores.js',
        'src/shared/dinheiro.js',
        'src/shared/cpf.js',
        'src/shared/placa.js',
        'src/middlewares/**/*.js',
      ],
      exclude: ['src/**/*.test.js'],
      thresholds: {
        statements: 70,
        lines: 70,
        functions: 60,
        branches: 60,
      },
    },
  },
});
