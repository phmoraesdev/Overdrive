import * as dashboardService from './dashboard.service.js';

export async function obter(req, res) {
  const dashboard = await dashboardService.montar(req.user);
  res.json(dashboard);
}
