import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/authContextBase.js';

function RotaProtegida({ perfis }) {
  const { funcionario, carregando } = useAuth();
  const location = useLocation();

  if (carregando) {
    return <p className="p-6 text-center text-slate-500">Carregando...</p>;
  }

  if (!funcionario) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (perfis && !perfis.includes(funcionario.perfil)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default RotaProtegida;
