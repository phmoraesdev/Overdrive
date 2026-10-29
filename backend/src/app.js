import cookieParser from 'cookie-parser';
import express from 'express';
import { errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import clientesRoutes from './modules/clientes/clientes.routes.js';
import funcionariosRoutes from './modules/funcionarios/funcionarios.routes.js';
import veiculosRoutes from './modules/veiculos/veiculos.routes.js';

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/funcionarios', funcionariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/veiculos', veiculosRoutes);

app.use(errorHandler);

export default app;
