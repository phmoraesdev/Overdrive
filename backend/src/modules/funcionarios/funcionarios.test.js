import bcrypt from 'bcrypt';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./funcionarios.repository.js', () => ({
  buscarPorEmailComSenha: vi.fn(),
  buscarPorId: vi.fn(),
  listar: vi.fn(),
  criar: vi.fn(),
  atualizar: vi.fn(),
  definirAtivo: vi.fn(),
  registrarTentativaFalha: vi.fn(),
  registrarLoginSucesso: vi.fn(),
  resetarTentativas: vi.fn(),
}));

const funcionariosRepository = await import('./funcionarios.repository.js');
const funcionariosService = await import('./funcionarios.service.js');

const SENHA_CORRETA = 'SenhaForte@123';
let senhaHash;

function criarFuncionarioFake(sobrescritas = {}) {
  return {
    id: 'func-1',
    nome: 'Funcionário Teste',
    email: 'teste@overdrive.com',
    senhaHash,
    perfil: 'RECEPCIONISTA',
    ativo: true,
    tentativasLogin: 0,
    bloqueadoAte: null,
    ...sobrescritas,
  };
}

beforeEach(async () => {
  senhaHash = await bcrypt.hash(SENHA_CORRETA, 4);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('autenticar', () => {
  it('autentica com credenciais válidas e reseta tentativas', async () => {
    const funcionario = criarFuncionarioFake();
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(funcionario);

    const resultado = await funcionariosService.autenticar({
      email: funcionario.email,
      senha: SENHA_CORRETA,
    });

    expect(resultado).toEqual({
      id: funcionario.id,
      nome: funcionario.nome,
      email: funcionario.email,
      perfil: funcionario.perfil,
    });
    expect(funcionariosRepository.registrarLoginSucesso).toHaveBeenCalledWith(funcionario.id);
  });

  it('rejeita senha errada e incrementa as tentativas', async () => {
    const funcionario = criarFuncionarioFake({ tentativasLogin: 1 });
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(funcionario);

    await expect(
      funcionariosService.autenticar({ email: funcionario.email, senha: 'errada' }),
    ).rejects.toMatchObject({ status: 401 });

    expect(funcionariosRepository.registrarTentativaFalha).toHaveBeenCalledWith(funcionario.id, {
      tentativasLogin: 2,
      bloqueadoAte: null,
    });
  });

  it('bloqueia a conta após a 5ª tentativa incorreta', async () => {
    const funcionario = criarFuncionarioFake({ tentativasLogin: 4 });
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(funcionario);

    await expect(
      funcionariosService.autenticar({ email: funcionario.email, senha: 'errada' }),
    ).rejects.toMatchObject({ status: 423 });

    const chamada = funcionariosRepository.registrarTentativaFalha.mock.calls[0];
    expect(chamada[1].tentativasLogin).toBe(5);
    expect(chamada[1].bloqueadoAte).toBeInstanceOf(Date);
  });

  it('rejeita login com a conta ainda bloqueada, mesmo com a senha certa', async () => {
    const funcionario = criarFuncionarioFake({
      tentativasLogin: 5,
      bloqueadoAte: new Date(Date.now() + 10 * 60 * 1000),
    });
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(funcionario);

    await expect(
      funcionariosService.autenticar({ email: funcionario.email, senha: SENHA_CORRETA }),
    ).rejects.toMatchObject({ status: 423 });

    expect(funcionariosRepository.registrarLoginSucesso).not.toHaveBeenCalled();
  });

  it('libera o login de novo depois que os 15 minutos de bloqueio passam', async () => {
    vi.useFakeTimers();
    const agora = new Date('2026-01-01T10:00:00.000Z');
    vi.setSystemTime(agora);

    const funcionario = criarFuncionarioFake({
      tentativasLogin: 5,
      bloqueadoAte: new Date(agora.getTime() + 15 * 60 * 1000),
    });
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(funcionario);

    vi.setSystemTime(new Date(agora.getTime() + 15 * 60 * 1000 + 1000));

    const resultado = await funcionariosService.autenticar({
      email: funcionario.email,
      senha: SENHA_CORRETA,
    });

    expect(resultado.id).toBe(funcionario.id);
    expect(funcionariosRepository.registrarLoginSucesso).toHaveBeenCalledWith(funcionario.id);
  });

  it('rejeita funcionário inativo mesmo com senha correta', async () => {
    const funcionario = criarFuncionarioFake({ ativo: false });
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(funcionario);

    await expect(
      funcionariosService.autenticar({ email: funcionario.email, senha: SENHA_CORRETA }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('rejeita e-mail inexistente sem revelar qual campo está errado', async () => {
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(null);

    await expect(
      funcionariosService.autenticar({ email: 'ninguem@overdrive.com', senha: 'qualquer' }),
    ).rejects.toMatchObject({ status: 401, message: 'E-mail ou senha incorretos.' });
  });
});

describe('criar', () => {
  it('bloqueia e-mail duplicado', async () => {
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(criarFuncionarioFake());

    await expect(
      funcionariosService.criar({
        nome: 'Novo',
        email: 'teste@overdrive.com',
        senha: 'SenhaForte@123',
        perfil: 'MECANICO',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('cria com a senha em hash, nunca em texto puro', async () => {
    funcionariosRepository.buscarPorEmailComSenha.mockResolvedValue(null);
    funcionariosRepository.criar.mockResolvedValue({ id: 'novo-id' });

    await funcionariosService.criar({
      nome: 'Novo',
      email: 'novo@overdrive.com',
      senha: 'SenhaForte@123',
      perfil: 'MECANICO',
    });

    const dadosEnviados = funcionariosRepository.criar.mock.calls[0][0];
    expect(dadosEnviados.senhaHash).not.toBe('SenhaForte@123');
    expect(dadosEnviados.senha).toBeUndefined();
  });
});

describe('definirAtivo', () => {
  it('lança erro quando o funcionário não existe', async () => {
    funcionariosRepository.buscarPorId.mockResolvedValue(null);

    await expect(funcionariosService.definirAtivo('inexistente', false)).rejects.toMatchObject({
      status: 404,
    });
  });
});
