# Overdrive

Sistema web de gestão para oficinas mecânicas de pequeno e médio porte.
Projeto da disciplina de Ciência da Computação, desenvolvido em equipe com Scrum.

> Status: **Sprint 1 concluída** — login por perfil, cadastro de funcionários,
> clientes e veículos. Ordem de serviço, agenda, estoque e financeiro entram nas
> próximas sprints.

## Stack

- **Frontend**: React + Vite, React Router, Tailwind CSS, axios.
- **Backend**: Node.js + Express (ES modules).
- **Banco de dados**: SQLite via Prisma (fácil de trocar por PostgreSQL depois).
- **Autenticação**: JWT em cookie httpOnly, senha com bcrypt.
- **Validação**: zod no backend, validação de formulário no frontend.
- **Testes**: Vitest + Supertest (backend).
- **Qualidade**: ESLint + Prettier (backend e frontend).

## Estrutura do repositório

```
overdrive/
  docs/              Requisitos, modelagem UML/BPMN e planejamento Scrum
  shell.nix          Ambiente Nix com os engines do Prisma (só necessário no NixOS)
  backend/
    prisma/          schema.prisma, migrations e seed.js
    src/
      modules/
        auth/          login, logout, sessão (usa o service de funcionarios)
        funcionarios/   CRUD de funcionários e perfis, autenticação de senha
        clientes/       CRUD de clientes, validação de CPF
        veiculos/       CRUD de veículos, validação de placa, transferência
        ordens/ agenda/ estoque/ financeiro/ relatorios/  (ainda vazios)
      middlewares/     authenticate, authorize, errorHandler
      shared/          cpf.js, placa.js, errors.js, asyncHandler.js, prismaClient.js
      app.js
      server.js
  frontend/
    src/
      pages/           Login, Home, Clientes, ClienteDetalhe, Funcionarios
      components/      Layout (menu por perfil), RotaProtegida
      services/        api.js, auth.js, clientes.js, veiculos.js, funcionarios.js
      contexts/        AuthContext (+ authContextBase.js com o hook useAuth)
```

## Pré-requisitos

- Node.js 20 ou superior
- npm

### NixOS

O Prisma baixa binários pré-compilados que não existem para NixOS (erro de checksum
404). Isso afeta não só `prisma generate`/`migrate`, mas **qualquer processo que
carregue o `app.js`/Prisma Client de verdade** — `npm run dev`, `npm run prisma:seed`
e também `npm test` (o `app.test.js` carrega a árvore de rotas inteira, que importa o
Prisma Client). Há um `shell.nix` na raiz do repositório que resolve isso fornecendo os
engines via nixpkgs. Entre no shell antes de qualquer um desses comandos:

```bash
nix-shell
cd backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
npm test
```

Os testes dos `*.service.js` usam o repositório **mockado** (nunca importam o Prisma de
verdade), então rodar só esses arquivos funciona fora do `nix-shell`. É `app.test.js`
puxando a árvore de rotas inteira que exige o shell para a suíte completa.

## Backend

```bash
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

O servidor sobe em `http://localhost:3001`. Teste com:

```bash
curl http://localhost:3001/api/health
# {"status":"ok"}
```

### Variáveis de ambiente (`backend/.env`)

| Variável       | Descrição                                       | Exemplo                                  |
|----------------|--------------------------------------------------|-------------------------------------------|
| `DATABASE_URL` | Caminho do banco SQLite                          | `file:./dev.db`                           |
| `PORT`         | Porta do servidor Express                        | `3001`                                    |
| `JWT_SECRET`   | Chave usada para assinar o cookie de sessão       | gere com `openssl rand -hex 32` em produção |

### Banco de dados (Prisma)

- `npm run prisma:generate` — gera o Prisma Client a partir do `schema.prisma`.
- `npm run prisma:migrate` — cria/atualiza as tabelas (`prisma migrate dev`).
- `npm run prisma:seed` — popula os dados de teste abaixo.

O `schema.prisma` já modela **todas** as entidades do domínio (RF02, RF03, RF06, RF13,
RF16 e as que ainda não têm tela: OS, checklist, orçamento, agendamento, peça,
movimentação de estoque, conta, parcela), com índices em CPF, placa e nome para busca
rápida (RNF01). A tabela `Auditoria` (RNF12) existe no schema como ponto de extensão,
mas nenhum código ainda grava nela — isso fica fora das sprints, como combinado.

### Dados de teste (seed)

| Perfil         | E-mail                   | Senha          |
|----------------|---------------------------|----------------|
| Administrador  | admin@overdrive.com       | `Admin@123`    |
| Recepcionista  | recepcao@overdrive.com    | `Recepcao@123` |
| Mecânico       | mecanico@overdrive.com    | `Mecanico@123` |

Também cria 3 clientes de teste (João da Silva, Maria Oliveira, Carlos Pereira) com
CPFs válidos e 3 veículos vinculados a eles.

### Autenticação e perfis

- `POST /api/auth/login` `{ email, senha }` → cookie `token` (JWT, httpOnly) + dados do
  funcionário.
- `POST /api/auth/logout` → limpa o cookie.
- `GET /api/auth/me` → dados do funcionário autenticado.
- Sessão expira em **30 min de inatividade**: cada requisição autenticada renova o
  cookie (RNF11). Sem atividade, o cookie expira e o próximo pedido recebe 401.
- Após **5 tentativas de senha incorreta**, a conta é bloqueada por **15 minutos**
  (HTTP 423, com mensagem informando quanto tempo falta).
- Funcionário inativo não consegue fazer login (403).
- `authorize('ADMINISTRADOR', ...)` nas rotas controla quem acessa o quê: cadastro de
  funcionários é exclusivo do Administrador; clientes e veículos podem ser alterados
  por Recepcionista e Administrador (Mecânico só consulta).

### Testes e qualidade

```bash
npm test     # Vitest (dentro do nix-shell, ver seção NixOS acima)
npm run lint # ESLint
npm run format # Prettier (escreve as correções)
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`. Rotas:

- `/login` — tela de login (pública).
- `/` — início (exige login).
- `/clientes`, `/clientes/:id` — cadastro de clientes e, dentro do detalhe, os
  veículos daquele cliente (exige perfil Recepcionista ou Administrador).
- `/funcionarios` — cadastro de funcionários (exige perfil Administrador).

O menu no topo só mostra os itens que o perfil logado pode acessar. Se a sessão
expirar, qualquer chamada à API que volte 401 desloga o usuário e mostra o aviso de
sessão expirada na tela de login.

### Testes e qualidade

```bash
npm run lint   # ESLint
npm run format # Prettier (escreve as correções)
npm run build  # build de produção
```

## Rodando tudo junto

Em dois terminais separados:

```bash
# terminal 1 (NixOS: rodar dentro de `nix-shell`, ver seção NixOS)
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Depois acesse `http://localhost:5173` e entre com um dos usuários de teste.

## Decisões de arquitetura

- **Prisma fixado na versão 6.19.3** (não a mais recente, 7.x): a partir da versão 7 o
  Prisma passou a exigir "driver adapters" explícitos até para SQLite, o que adiciona
  complexidade sem necessidade para este projeto. A 6.19.3 usa o modelo clássico
  (`@prisma/client` direto), mais simples de explicar e com toda a documentação/tutoriais
  já no mesmo padrão.
- **Proxy do Vite em vez de CORS**: em desenvolvimento, o frontend chama `/api/...` e o
  próprio Vite repassa para o backend. Isso evita configurar CORS por enquanto; quando
  o deploy real for definido, essa decisão será revisitada.
- **IDs com `cuid()` em vez de autoincremento**: gerados pela aplicação, não pelo
  banco, para o schema continuar portável entre SQLite e um banco diferente depois.
- **Módulo só acessa outro módulo pelo `service`**: por exemplo, `veiculos.service.js`
  chama `clientesService.buscarPorId()` para validar o dono do veículo, em vez de
  consultar a tabela de clientes direto — mantém as camadas isoladas (RNF14).
- **Sessão com renovação deslizante**: em vez de um token com validade fixa desde o
  login, o middleware `authenticate` reemite o cookie a cada requisição autenticada,
  com nova validade de 30 min — é isso que implementa "expira após 30 min de
  inatividade".
- **Mensagens de erro de login genéricas** ("E-mail ou senha incorretos.") tanto para
  e-mail inexistente quanto para senha errada, para não revelar quais e-mails estão
  cadastrados.
- **Permissões por módulo**: leitura de clientes/veículos liberada para qualquer
  perfil autenticado (um mecânico pode precisar consultar um cliente); escrita
  restrita a Recepcionista e Administrador; tudo em funcionários é exclusivo do
  Administrador. Isso não estava 100% especificado no prompt da sprint — foi uma
  escolha razoável, documentada aqui para o time revisar.

## Sobre os documentos em `docs/`

Existem duas versões do documento de requisitos:

- `Overdrive_Requisitos_e_Modelagem.pdf` — versão antiga, só com RF01–RF10 e
  RNF01–RNF06 e um diagrama de estados simplificado da OS. **Desatualizada.**
- `Overdrive_Requisitos_e_Modelagem.docx` — versão atual, com RF01–RF18 e RNF01–RNF16,
  consistente com o backlog da Sprint (`Overdrive_Scrum_Planejamento.xlsx`). **Esta é a
  fonte de verdade.**

O diagrama de estados da OS no `.docx` define 7 estados, já usados no `schema.prisma`
(enum `StatusOrdemServico`):

```
Aberta → Aguardando Aprovação → (Reprovada [fim] | Em Execução)
Em Execução ⇄ Aguardando Peça → ... → Pronto para Retirada → Encerrada [fim]
```

Ou seja, não existe estado "Em Diagnóstico" (a OS vai direto de Aberta para a
elaboração do orçamento), o estado final de reprovação chama-se **Reprovada** (não
"Cancelada"), e "Aguardando Peça" é um estado próprio dentro da execução.

## Pendências conhecidas

- Testado via `curl` simulando o navegador (login, cookies, proxy); não houve
  checagem visual na tela — não há ferramenta de browser disponível neste ambiente.
  Vale conferir visualmente antes da apresentação.
- Auditoria (RNF12) é só a tabela no schema, sem nenhum código gravando registros
  ainda, como combinado no prompt mestre.
- RNF01/RNF02 (tempo de resposta e carga) não foram medidos — o schema tem os índices
  necessários, mas não há teste de carga nesta sprint.
- Sem testes automatizados no frontend ainda.
