import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import RotaProtegida from './components/RotaProtegida';
import Login from './pages/Login';
import Home from './pages/Home';
import Clientes from './pages/Clientes';
import ClienteDetalhe from './pages/ClienteDetalhe';
import Funcionarios from './pages/Funcionarios';

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
              </Route>

              <Route element={<RotaProtegida perfis={['ADMINISTRADOR']} />}>
                <Route path="/funcionarios" element={<Funcionarios />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
