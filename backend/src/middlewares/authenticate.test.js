import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { authenticate, gerarTokenSessao } from './authenticate.js';
import { errorHandler } from './errorHandler.js';

beforeAll(() => {
  process.env.JWT_SECRET = 'segredo-de-teste';
});

function criarApp() {
  const app = express();
  app.use(cookieParser());
  app.get('/perfil', authenticate, (req, res) => res.json(req.user));
  app.use(errorHandler);
  return app;
}

describe('authenticate', () => {
  it('libera acesso com um cookie de sessão válido', async () => {
    const token = gerarTokenSessao({ id: '1', nome: 'Ana', perfil: 'ADMINISTRADOR' });
    const response = await request(criarApp()).get('/perfil').set('Cookie', [`token=${token}`]);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: '1', perfil: 'ADMINISTRADOR' });
  });

  it('nega acesso sem cookie de sessão', async () => {
    const response = await request(criarApp()).get('/perfil');
    expect(response.status).toBe(401);
  });

  it('nega acesso com token inválido', async () => {
    const response = await request(criarApp()).get('/perfil').set('Cookie', ['token=invalido']);
    expect(response.status).toBe(401);
  });

  it('renova o cookie de sessão a cada requisição autenticada', async () => {
    const token = gerarTokenSessao({ id: '1', nome: 'Ana', perfil: 'ADMINISTRADOR' });
    const response = await request(criarApp()).get('/perfil').set('Cookie', [`token=${token}`]);

    const cookieRenovado = response.headers['set-cookie']?.[0] ?? '';
    expect(cookieRenovado).toMatch(/^token=/);
  });
});
