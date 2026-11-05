import { useAuth } from '../contexts/authContextBase.js';
import { formatarData } from '../utils/formatacao';

function Home() {
  const { funcionario } = useAuth();

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold text-slate-900">Bem-vindo(a), {funcionario?.nome}</h1>
      <p className="text-sm text-slate-500">{formatarData(new Date())}</p>
    </section>
  );
}

export default Home;
