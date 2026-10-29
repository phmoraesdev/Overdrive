import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authorize } from './authorize.js';
import { errorHandler } from './errorHandler.js';

function appComPerfil(perfil) {
  const app = express();
  app.use((req, res, next) => {
    req.user = perfil ? { id: '1', nome: 'Teste', perfil } : null;
    next();
  });
  app.get('/admin', authorize('ADMINISTRADOR'), (req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('authorize', () => {
  it('permite acesso quando o perfil está na lista liberada', async () => {
    const response = await request(appComPerfil('ADMINISTRADOR')).get('/admin');
    expect(response.status).toBe(200);
  });

  it('nega acesso quando o perfil não está na lista liberada', async () => {
    const response = await request(appComPerfil('MECANICO')).get('/admin');
    expect(response.status).toBe(403);
  });

  it('nega acesso quando não há usuário autenticado', async () => {
    const response = await request(appComPerfil(null)).get('/admin');
    expect(response.status).toBe(403);
  });
});
