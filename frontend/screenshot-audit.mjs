// Script de verificação visual (não faz parte do app) — tira screenshots em
// 768px e 1280px de cada tela e mede se há rolagem horizontal, para
// confirmar de verdade (não só visualmente) as correções de responsividade.
// Uso: node screenshot-audit.mjs <antes|depois> <clienteId> <ordemServicoId>
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const fase = process.argv[2] ?? 'antes';
const clienteId = process.argv[3];
const ordemServicoId = process.argv[4];

const BASE_URL = 'http://localhost:5173';
const DIR_SAIDA = `screenshot-audit/${fase}`;
mkdirSync(DIR_SAIDA, { recursive: true });

const VIEWPORTS = [
  { nome: '768px', width: 768, height: 1024 },
  { nome: '1280px', width: 1280, height: 800 },
];

const TELAS = [
  { nome: 'login', url: '/login', precisaLogin: false },
  { nome: 'home', url: '/', precisaLogin: true },
  { nome: 'clientes', url: '/clientes', precisaLogin: true },
  { nome: 'cliente-detalhe', url: `/clientes/${clienteId}`, precisaLogin: true },
  { nome: 'funcionarios', url: '/funcionarios', precisaLogin: true },
  { nome: 'abrir-os', url: '/ordens/abrir', precisaLogin: true },
  { nome: 'historico-os', url: '/ordens/historico', precisaLogin: true },
  { nome: 'painel-os', url: '/ordens/painel', precisaLogin: true },
  { nome: 'ordem-detalhe', url: `/ordens/${ordemServicoId}`, precisaLogin: true },
  { nome: 'agenda', url: '/agenda', precisaLogin: true },
  { nome: 'pecas', url: '/pecas', precisaLogin: true },
  { nome: 'financeiro', url: '/financeiro', precisaLogin: true },
  { nome: 'relatorios', url: '/relatorios', precisaLogin: true },
];

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', 'admin@overdrive.com');
  await page.fill('#senha', 'Admin@123');
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/`);
}

async function medirOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      temRolagemHorizontal: doc.scrollWidth > doc.clientWidth,
    };
  });
}

async function main() {
  const browser = await chromium.launch();
  const resultados = [];

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    await login(page);

    for (const tela of TELAS) {
      if (tela.nome === 'login') {
        // tela de login é sempre deslogada — usa um contexto novo, sem cookie
        const contextoLogin = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
        });
        const paginaLogin = await contextoLogin.newPage();
        await paginaLogin.goto(`${BASE_URL}${tela.url}`);
        await paginaLogin.waitForTimeout(300);
        const overflow = await medirOverflow(paginaLogin);
        const arquivo = `${DIR_SAIDA}/${tela.nome}-${viewport.nome}.png`;
        await paginaLogin.screenshot({ path: arquivo, fullPage: true });
        resultados.push({ tela: tela.nome, viewport: viewport.nome, ...overflow, arquivo });
        await contextoLogin.close();
        continue;
      }

      await page.goto(`${BASE_URL}${tela.url}`);
      await page.waitForTimeout(500);
      const overflow = await medirOverflow(page);
      const arquivo = `${DIR_SAIDA}/${tela.nome}-${viewport.nome}.png`;
      await page.screenshot({ path: arquivo, fullPage: true });
      resultados.push({ tela: tela.nome, viewport: viewport.nome, ...overflow, arquivo });
    }

    await context.close();
  }

  await browser.close();

  writeFileSync(`${DIR_SAIDA}/relatorio.json`, JSON.stringify(resultados, null, 2));

  console.log(`\n=== Relatório de rolagem horizontal (${fase}) ===`);
  for (const r of resultados) {
    const marca = r.temRolagemHorizontal ? 'ROLAGEM HORIZONTAL' : 'ok';
    console.log(
      `${r.tela.padEnd(16)} ${r.viewport.padEnd(7)} scrollWidth=${r.scrollWidth} clientWidth=${r.clientWidth}  ${marca}`,
    );
  }
}

main();
