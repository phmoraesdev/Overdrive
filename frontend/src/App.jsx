import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import RotaProtegida from './components/RotaProtegida';
import Login from './pages/Login';
import Home from './pages/Home';
import Clientes from './pages/Clientes';
import ClienteDetalhe from './pages/ClienteDetalhe';
import Funcionarios from './pages/Funcionarios';
import AbrirOS from './pages/AbrirOS';
import HistoricoVeiculo from './pages/HistoricoVeiculo';
import OrdemDetalhe from './pages/OrdemDetalhe';
import PainelOS from './pages/PainelOS';
import Agenda from './pages/Agenda';
import Pecas from './pages/Pecas';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RotaProtegida />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />

              <Route element={<RotaProtegida perfis={['RECEPCIONISTA', 'ADMINISTRADOR']} />}>
                <Route path="/clientes" element={<Clientes />} />
                <Route path="/clientes/:id" element={<ClienteDetalhe />} />
                <Route path="/ordens/abrir" element={<AbrirOS />} />
                <Route path="/agenda" element={<Agenda />} />
              </Route>

              <Route path="/ordens/historico" element={<HistoricoVeiculo />} />
              <Route path="/ordens/painel" element={<PainelOS />} />
              <Route path="/ordens/:id" element={<OrdemDetalhe />} />
              <Route path="/pecas" element={<Pecas />} />

              <Route element={<RotaProtegida perfis={['ADMINISTRADOR']} />}>
                <Route path="/funcionarios" element={<Funcionarios />} />
                <Route path="/financeiro" element={<Financeiro />} />
                <Route path="/relatorios" element={<Relatorios />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
