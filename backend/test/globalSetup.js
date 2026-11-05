import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_BACKEND = path.resolve(__dirname, '..');
const CAMINHO_BANCO_TESTE = path.join(DIR_BACKEND, 'prisma', 'test.db');

// Precisa bater com `test.env.DATABASE_URL` em vitest.config.js — aqui é o
// valor usado só para rodar as migrations (processo separado dos workers de
// teste, que recebem o `test.env` do próprio Vitest).
export const DATABASE_URL_TESTE = 'file:./test.db';

function removerArquivosDoBanco() {
  for (const sufixo of ['', '-journal', '-wal', '-shm']) {
    const arquivo = `${CAMINHO_BANCO_TESTE}${sufixo}`;
    if (existsSync(arquivo)) {
      rmSync(arquivo);
    }
  }
}

// Roda uma vez antes da suíte inteira (Vitest `globalSetup`): cria um banco
// SQLite isolado (prisma/test.db) do zero, a partir das migrations — os
// testes nunca tocam no dev.db usado por `npm run dev` e pelo seed de
// demonstração. A função retornada roda depois da suíte inteira e apaga o
// banco de teste, para a próxima execução sempre começar limpa (nenhum teste
// fica dependendo de dado deixado por uma execução anterior).
export default async function setup() {
  removerArquivosDoBanco();

  execSync('npx prisma migrate deploy', {
    cwd: DIR_BACKEND,
    env: { ...process.env, DATABASE_URL: DATABASE_URL_TESTE },
    stdio: 'inherit',
  });

  return () => {
    removerArquivosDoBanco();
  };
}
