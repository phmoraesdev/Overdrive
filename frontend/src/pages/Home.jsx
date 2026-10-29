import { useAuth } from '../contexts/authContextBase.js';

function Home() {
  const { funcionario } = useAuth();

  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold text-slate-900">Olá, {funcionario?.nome}</h1>
      <p className="text-slate-600">
        Perfil: <span className="font-medium">{funcionario?.perfil}</span>
      </p>
    </section>
  );
}

export default Home;
