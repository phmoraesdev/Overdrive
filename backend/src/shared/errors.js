export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export class NaoEncontradoError extends AppError {
  constructor(message = 'Registro não encontrado.') {
    super(message, 404);
    this.name = 'NaoEncontradoError';
  }
}

export class ConflitoError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflitoError';
  }
}

export class NaoAutorizadoError extends AppError {
  constructor(message = 'Sessão expirada. Faça login novamente.') {
    super(message, 401);
    this.name = 'NaoAutorizadoError';
  }
}

export class AcessoNegadoError extends AppError {
  constructor(message = 'Seu perfil não tem acesso a este recurso.') {
    super(message, 403);
    this.name = 'AcessoNegadoError';
  }
}
