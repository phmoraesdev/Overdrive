import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/authContextBase.js';

function Login() {
  const { entrar, sessaoExpirada } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(event) {
    event.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await entrar(email, senha);
      const destino = location.state?.from?.pathname ?? '/';
      navigate(destino, { replace: true });
    } catch (error) {
      setErro(error.response?.data?.message ?? 'Não foi possível entrar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-8 shadow"
      >
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overdrive</h1>
          <p className="text-sm text-slate-500">Entre com seu usuário da oficina.</p>
        </div>

        {sessaoExpirada && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700" role="status">
            Sua sessão expirou. Faça login novamente.
          </p>
        )}
        {erro && (
          <p id="erro-login" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {erro}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            aria-describedby={erro ? 'erro-login' : undefined}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700" htmlFor="senha">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            autoComplete="current-password"
            required
            aria-describedby={erro ? 'erro-login' : undefined}
            value={senha}
            onChange={(event) => setSenha(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

export default Login;
