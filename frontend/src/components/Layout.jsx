import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/authContextBase.js';

const ITENS_MENU = [
  { to: '/', label: 'Início', perfis: null },
  { to: '/clientes', label: 'Clientes', perfis: ['RECEPCIONISTA', 'ADMINISTRADOR'] },
  { to: '/ordens/abrir', label: 'Abrir OS', perfis: ['RECEPCIONISTA', 'ADMINISTRADOR'] },
  { to: '/ordens/painel', label: 'Painel de OS', perfis: null },
  { to: '/ordens/historico', label: 'Histórico de OS', perfis: null },
  { to: '/agenda', label: 'Agenda', perfis: ['RECEPCIONISTA', 'ADMINISTRADOR'] },
  { to: '/pecas', label: 'Peças', perfis: null },
  { to: '/financeiro', label: 'Financeiro', perfis: ['ADMINISTRADOR'] },
  { to: '/relatorios', label: 'Relatórios', perfis: ['ADMINISTRADOR'] },
  { to: '/funcionarios', label: 'Funcionários', perfis: ['ADMINISTRADOR'] },
];

function linkClasses({ isActive }) {
  return `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
  }`;
}

function Layout() {
  const { funcionario, sair } = useAuth();

  const itensVisiveis = ITENS_MENU.filter(
    (item) => !item.perfis || item.perfis.includes(funcionario?.perfil),
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold text-slate-900">Overdrive</span>
          <nav className="flex gap-1" aria-label="Menu principal">
            {itensVisiveis.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={linkClasses}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <span>
            {funcionario?.nome} · {funcionario?.perfil}
          </span>
          <button
            type="button"
            onClick={sair}
            className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100"
          >
            Sair
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
