# Overdrive

Sistema web de gestão para oficinas mecânicas de pequeno e médio porte.
Projeto da disciplina de Ciência da Computação, desenvolvido em equipe com Scrum.

> Status: **Sprint 4 concluída — projeto entregue.** Ciclo completo do negócio:
> login por perfil, cadastro de clientes/veículos/funcionários, agenda,
> abertura de OS com checklist, orçamento, decisão do cliente, painel Kanban
> de status, encerramento com pagamento (à vista ou parcelado) e baixa
> automática de estoque, notificação ao cliente (e-mail/WhatsApp), alerta de
> estoque mínimo, financeiro (contas a pagar/receber e fluxo de caixa) e
> relatórios gerenciais exportáveis em PDF/XLSX. Backup automático e
> auditoria (RNF08/RNF12) ficam como trabalho futuro — ver a seção no fim
> deste documento.

## Sumário

- [Stack](#stack)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente-backendenv)
- [Banco de dados e dados de demonstração](#banco-de-dados-e-dados-de-demonstração)
- [Usuários de teste](#usuários-de-teste)
- [Testes e cobertura](#testes-e-cobertura)
- [Referência da API por módulo](#referência-da-api-por-módulo)
- [Frontend (rotas)](#frontend-rotas)
- [Decisões de arquitetura](#decisões-de-arquitetura)
- [Documentos do projeto](#documentos-do-projeto-docs)
- [Trabalho futuro](#trabalho-futuro)
- [Pendências conhecidas](#pendências-conhecidas)

## Stack

- **Frontend**: React + Vite, React Router, Tailwind CSS, axios.
- **Backend**: Node.js + Express (ES modules).
- **Banco de dados**: SQLite via Prisma (fácil de trocar por PostgreSQL depois).
- **Autenticação**: JWT em cookie httpOnly, senha com bcrypt.
- **Validação**: zod no backend, validação de formulário no frontend.
- **Notificações**: Nodemailer (e-mail) + webhook HTTP genérico (WhatsApp), com
  provedor simulado por padrão.
- **Relatórios**: pdfkit (PDF) e ExcelJS (XLSX).
- **Testes**: Vitest + Supertest (backend), cobertura via `@vitest/coverage-v8`.
- **Qualidade**: ESLint + Prettier (backend e frontend).

## Estrutura do repositório

```
overdrive/
  docs/
    Overdrive_Requisitos_e_Modelagem.docx   Requisitos e modelagem UML/BPMN (fonte de verdade)
    Overdrive_Scrum_Planejamento.xlsx       Backlog, sprints e cerimônias
    ROTEIRO_DEMONSTRACAO.md                 Roteiro de apresentação de 5 minutos
  shell.nix          Ambiente Nix com os engines do Prisma (só necessário no NixOS)
  backend/
    prisma/          schema.prisma, migrations e seed.js (dados de demonstração)
    src/
      modules/
        auth/            login, logout, sessão (usa o service de funcionarios)
        funcionarios/    CRUD de funcionários e perfis, autenticação de senha
        clientes/        CRUD de clientes, validação de CPF
        veiculos/        CRUD de veículos, validação de placa, transferência
        ordens/          abertura + checklist, histórico, orçamento, decisão do
                         cliente, status (painel Kanban), encerramento/pagamento,
                         recibo em PDF (ordens.recibo.js)
        agenda/          agendar, reagendar e cancelar atendimentos (limite de boxes)
        estoque/         CRUD de peças, baixa de estoque e alerta de mínimo (pecas.*.js)
        notificacoes/    aviso ao cliente (e-mail/WhatsApp), provedor simulado/real
        financeiro/      contas a pagar/receber, baixa de pagamento, fluxo de caixa
        relatorios/      faturamento, desempenho por mecânico, exportação PDF/XLSX
      middlewares/     authenticate, authorize, errorHandler
      shared/          cpf.js, placa.js, errors.js, asyncHandler.js, prismaClient.js,
                       dinheiro.js (matemática de centavos usada em orçamento e financeiro)
      app.js
      server.js
      integracao.fluxo-completo.test.js   Teste de ponta a ponta (cadastro → OS → financeiro)
    vitest.config.js   Configuração de cobertura (escopo e limites — ver "Testes e cobertura")
  frontend/
    src/
      pages/           Login, Home, Clientes, ClienteDetalhe, Funcionarios,
                       AbrirOS, HistoricoVeiculo, OrdemDetalhe, PainelOS, Agenda,
                       Pecas, Financeiro, Relatorios
      components/      Layout (menu por perfil), RotaProtegida
      services/        um arquivo por módulo da API (api.js, auth.js, clientes.js,
                       veiculos.js, funcionarios.js, ordens.js, agenda.js, pecas.js,
                       financeiro.js, relatorios.js)
      contexts/        AuthContext (+ authContextBase.js com o hook useAuth)
```

## Instalação e execução

### Pré-requisitos

- Node.js 20 ou superior
- npm

### NixOS

O Prisma baixa binários pré-compilados que não existem para NixOS (erro de checksum
404). Isso afeta não só `prisma generate`/`migrate`, mas **qualquer processo que
carregue o `app.js`/Prisma Client de verdade** — `npm run dev`, `npm run prisma:seed`,
`npm test` (o `app.test.js` e o teste de integração carregam a árvore de rotas
inteira, que importa o Prisma Client) e `npm run test:coverage`. Há um `shell.nix` na
raiz do repositório que resolve isso fornecendo os engines via nixpkgs. Entre no shell
**a partir da raiz do repositório** antes de qualquer um desses comandos:

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
verdade), então rodar só esses arquivos funciona fora do `nix-shell`. São o
`app.test.js` e o `integracao.fluxo-completo.test.js`, que puxam a árvore de rotas
inteira, que exigem o shell para a suíte completa.

### Passo a passo

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev          # sobe em http://localhost:3001

# 2. Frontend (em outro terminal)
cd frontend
npm install
npm run dev           # sobe em http://localhost:5173
```

Teste o backend com:

```bash
curl http://localhost:3001/api/health
# {"status":"ok"}
```

Depois acesse `http://localhost:5173` e entre com um dos [usuários de teste](#usuários-de-teste).

## Variáveis de ambiente (`backend/.env`)

| Variável                   | Descrição                                                          | Exemplo/padrão |
|-----------------------------|---------------------------------------------------------------------|-----------------|
| `DATABASE_URL`              | Caminho do banco SQLite                                             | `file:./dev.db` |
| `PORT`                      | Porta do servidor Express                                           | `3001`          |
| `JWT_SECRET`                | Chave usada para assinar o cookie de sessão                         | gere com `openssl rand -hex 32` em produção |
| `LIMITE_BOXES_POR_HORARIO`  | Boxes que atendem ao mesmo tempo na agenda                          | `3` |
| `PROVEDOR_NOTIFICACAO`      | `simulado` (padrão, só loga e grava no banco) ou `real`              | `simulado` |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` | Só usados com `PROVEDOR_NOTIFICACAO=real` — credenciais SMTP (Nodemailer) | — |
| `WHATSAPP_API_URL`/`WHATSAPP_API_TOKEN` | Só usados com `PROVEDOR_NOTIFICACAO=real` — webhook HTTP que aceite `POST {to, message}` | — |

Todas essas variáveis (com os valores padrão/placeholders) já estão em
`backend/.env.example` — é só copiar para `.env` e ajustar o que for preciso.
Em desenvolvimento, nenhuma delas além de `DATABASE_URL`/`PORT`/`JWT_SECRET` é
obrigatória: o provedor de notificação simulado funciona sem nenhuma credencial.

## Banco de dados e dados de demonstração

```bash
npm run prisma:generate  # gera o Prisma Client a partir do schema.prisma
npm run prisma:migrate   # cria/atualiza as tabelas (prisma migrate dev)
npm run prisma:seed      # popula os dados abaixo
```

O `schema.prisma` modela **todas** as entidades do domínio, com índices em CPF, placa
e nome para busca rápida (RNF01).

O seed (`backend/prisma/seed.js`) não cria os dados "na mão" direto no banco — ele usa
a própria camada de `service` (a mesma que a API usa) para abrir e conduzir as OS pelo
ciclo completo, então os dados de demonstração já nascem respeitando todas as regras de
negócio (numeração sequencial, checklist obrigatório, cálculo de orçamento, transições
de status válidas, baixa de estoque etc.). Ele é **seguro para rodar mais de uma vez**:
cada etapa confere se os dados dela já existem antes de criar de novo.

Ele cria:

- 4 funcionários (1 Administrador, 1 Recepcionista, 2 Mecânicos — ver
  [usuários de teste](#usuários-de-teste)).
- 6 clientes com CPFs válidos e 8 veículos vinculados a eles.
- 4 peças, uma delas (pastilha de freio) já abaixo do estoque mínimo de propósito.
- **8 ordens de serviço, uma em cada estágio do ciclo**: Aberta, Aguardando aprovação,
  Em execução (aprovação parcial — um item foi recusado pelo cliente), Aguardando
  peça, Pronto para retirada (já notificou o cliente), 2 Encerradas (uma paga à vista,
  outra parcelada em 3x — com baixa de estoque, recibo e lançamento financeiro já
  prontos) e 1 Reprovada (com motivo registrado).
- 3 agendamentos de exemplo (hoje e amanhã).
- 3 contas a pagar manuais (uma vencida, uma já paga, uma em aberto no futuro), além
  das 2 contas a receber geradas automaticamente pelas OS encerradas.

Esse conjunto foi pensado para o [roteiro de demonstração](docs/ROTEIRO_DEMONSTRACAO.md)
— há sempre uma OS pronta para mostrar cada parte do fluxo sem precisar montar tudo na
hora. Os valores de faturamento/desempenho dos relatórios batem exatamente com esses
dados (conferido via curl: faturamento total R$ 674,00 em 2 OS, ticket médio R$ 337,00;
Marcos Mecânico R$ 120,00 e Bruno Borracheiro R$ 350,00 de mão de obra).

## Usuários de teste

| Perfil         | E-mail                    | Senha           |
|----------------|----------------------------|-----------------|
| Administrador  | admin@overdrive.com        | `Admin@123`     |
| Recepcionista  | recepcao@overdrive.com     | `Recepcao@123`  |
| Mecânico       | mecanico@overdrive.com     | `Mecanico@123`  |
| Mecânico       | bruno@overdrive.com        | `Bruno@123`     |

## Testes e cobertura

```bash
cd backend
npm test             # suíte completa (Vitest) — dentro do nix-shell no NixOS
npm run test:coverage  # suíte completa + relatório de cobertura (texto + HTML em backend/coverage/)
npm run lint          # ESLint
npm run format        # Prettier (escreve as correções)
```

- **207 testes**, cobrindo o cálculo do orçamento (peças, mão de obra, arredondamento
  de centavos), a baixa de estoque (normal, saldo insuficiente, nunca em itens
  reprovados, atomicidade da transação) e os lançamentos financeiros (contas, baixa de
  pagamento, fluxo de caixa) — exigência da RNF15/PB21.
- **Cobertura** (`vitest.config.js`) é medida só nas regras de negócio — os
  `*.service.js` de cada módulo, mais `shared/dinheiro.js`, `shared/cpf.js`,
  `shared/placa.js`, os middlewares e os helpers de exportação/notificação. Rotas,
  controllers (só parsing + repasse) e schemas (declarativos) ficam de fora por não
  serem "regra de negócio"; os `*.repository.js` também ficam de fora — são wrappers
  finos do Prisma, sempre no formato `prisma.x.y(...)`, verificados manualmente contra
  o banco real (não há sentido em mockar o Prisma inteiro só para cobrir uma query).
  Resultado nesse escopo: **~90% statements/lines/functions, ~75% branches** — acima
  da meta de 70% da RNF15. Os três módulos citados explicitamente no PB21 (orçamento e
  baixa de estoque em `ordens`/`estoque`, lançamentos em `financeiro`) estão em
  **100%** statements/lines/functions. Os módulos de Sprint 1 (`auth`, `veiculos`,
  `funcionarios`, `clientes`) têm cobertura mais baixa — não são "regra de negócio" no
  sentido do RNF15 e ficaram fora do escopo desta rodada; ver
  [pendências](#pendências-conhecidas).
- **Teste de integração** (`src/integracao.fluxo-completo.test.js`): bate na API real
  (Express + Prisma + SQLite) simulando o roteiro completo pedido no PB21 — cadastrar
  cliente e veículo, abrir OS, montar e finalizar o orçamento, aprovar, executar,
  encerrar com pagamento, baixa de estoque, lançamento financeiro, recibo e
  notificação — tudo numa única execução, com dados gerados aleatoriamente para poder
  rodar várias vezes sem colidir com dados existentes. Exige os usuários do seed
  (`npm run prisma:seed`) e o nix-shell no NixOS, pelo mesmo motivo do `app.test.js`.
- **Falha real encontrada e corrigida durante esta sprint**: o guard de idempotência do
  seed de financeiro contava *qualquer* `Conta` no banco para decidir se já tinha
  rodado — mas o próprio fluxo de demonstração já cria 2 contas (das OS encerradas)
  *antes* dessa etapa rodar, então ele sempre achava "já rodou" e pulava as 3 contas
  manuais de propósito. Corrigido para contar só as contas sem OS vinculada
  (`ordemServicoId: null`) — ver o comentário em `prisma/seed.js#seedFinanceiro`.

## Referência da API por módulo

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

### Ordens de serviço (RF04, RF06, RF07, RNF03, RNF09)

- `GET /api/ordens/buscar-veiculo?placa=` — dados do veículo e do cliente dono, se há
  uma OS em andamento e qual foi a última quilometragem registrada (Recepcionista e
  Administrador).
- `POST /api/ordens` — abre a OS com o checklist de entrada na mesma chamada (RNF03:
  o front manda tudo de uma vez, sem sair da tela de abertura). Checklist é obrigatório
  (RF07) — sem `checklist.nivelCombustivel` o schema já rejeita o corpo.
- `GET /api/ordens?placa=` — histórico de OS do veículo, da mais recente para a mais
  antiga (RF04; qualquer perfil autenticado consulta).
- `GET /api/ordens/:id` — detalhe de uma OS com o checklist.
- Avisos que exigem confirmação (RF06): se o veículo já tem OS em andamento (status
  diferente de `REPROVADA`/`ENCERRADA`) ou se o km informado é menor que o da última
  OS, `POST /api/ordens` responde `409` com `{ message, avisos: [{ tipo, mensagem }] }`
  em vez de criar a OS. Reenviar com `ignorarAvisos: true` confirma e abre mesmo assim.
- O número da OS é sequencial (`numero = última OS + 1`), gerado dentro da mesma
  transação que grava o checklist, para não ter duas OS com o mesmo número.
- RNF09 (rascunho): o front salva o formulário de abertura no `localStorage` a cada
  mudança e recupera se a página recarregar antes de enviar.

### Orçamento da OS (RF08/PB11)

- `GET /api/ordens/:id/orcamento` — itens com o total de cada um e o total geral,
  calculados no backend (`shared/dinheiro.js`), nunca no frontend.
- `POST /api/ordens/:id/orcamento/itens` — adiciona um item de peça (busca
  `descricao`/`precoVenda` da peça automaticamente) ou de mão de obra (descrição e
  valor informados). Só com a OS em status `ABERTA`; só Mecânico e Administrador.
- `PATCH /api/ordens/:id/orcamento/itens/:itemId` / `DELETE .../itens/:itemId` —
  edita ou remove um item, mesma restrição de status/perfil.
- `POST /api/ordens/:id/orcamento/finalizar` — bloqueia orçamento vazio (400); muda
  o status para `AGUARDANDO_APROVACAO` e define o mecânico responsável pela OS
  (`mecanicoId`) como quem finalizou — é esse campo que o relatório de desempenho por
  mecânico (PB20) usa.
- Peça com quantidade pedida maior que o saldo: avisa (`{ aviso: { tipo:
  'ESTOQUE_INSUFICIENTE', mensagem } }` na resposta do item) mas **não bloqueia** —
  o estoque só é validado de verdade no encerramento (PB17), quando a baixa acontece.
- Sem campo de desconto: não há nada nos requisitos (RF08) nem no backlog pedindo essa
  funcionalidade, então o total é só a soma dos itens (peças + mão de obra).

### Decisão do orçamento (RF09/PB12)

- `POST /api/ordens/:id/decisao` `{ decisao, meioContato, motivo?, itensAprovadosIds?
  }` — só com a OS em `AGUARDANDO_APROVACAO`; só Recepcionista e Administrador.
  - `decisao: 'APROVADO'` → todos os itens ficam `aprovado: true`, status vai para
    `EM_EXECUCAO`.
  - `'APROVADO_PARCIAL'` → só os itens em `itensAprovadosIds` ficam aprovados (os
    demais continuam `aprovado: false`), status vai para `EM_EXECUCAO`. O schema
    exige a lista não vazia.
  - `'REPROVADO'` → nenhum item fica aprovado, status vai para `REPROVADA` (estado
    final, igual ao diagrama). O schema exige `motivo`.
  - `meioContato` (`TELEFONE`/`WHATSAPP`/`PRESENCIAL`), a decisão e a data/hora ficam
    gravadas na própria OS (`decisaoOrcamento`, `meioContatoDecisao`,
    `decisaoRegistradaEm`, `motivoReprovacao`).

### Status da OS e painel Kanban (RF10/PB13)

- `GET /api/ordens/painel` — todas as OS que ainda não chegaram a um estado final
  (nem `REPROVADA`, nem `ENCERRADA`), para montar o quadro por status.
- `PATCH /api/ordens/:id/status` `{ status }` — só Mecânico e Administrador, e só as
  transições que o mecânico resolve sozinho no dia a dia:
  `EM_EXECUCAO ⇄ AGUARDANDO_PECA` e `EM_EXECUCAO → PRONTO_PARA_RETIRADA`. Qualquer
  outra transição (abrir orçamento, decisão do cliente, encerrar) tem sua própria
  rota com as regras/dados que ela exige, e `400` aqui se for tentada por este
  endpoint genérico.
- Toda mudança de status (por qualquer rota) grava uma linha em `HistoricoStatusOS`
  com status anterior, novo, quem alterou e quando — aparece no detalhe da OS.
- Ao entrar em `PRONTO_PARA_RETIRADA`, dispara a notificação ao cliente (ver abaixo) e
  a resposta vem com `{ ..., alertaRecepcao: boolean }`.

### Notificação ao cliente (RF11/PB14)

- Disparada automaticamente por `PATCH /api/ordens/:id/status` quando o novo status é
  `PRONTO_PARA_RETIRADA` — manda e-mail e WhatsApp (o que o cliente tiver cadastrado),
  sempre com o número da OS na mensagem.
- `GET /api/ordens/:id/notificacoes` — histórico do que foi enviado para aquela OS
  (canal, destinatário, status `ENVIADA`/`FALHA`, erro se houver).
- Dois provedores atrás da mesma interface (`notificacoes.provedores.js`), trocados
  pela variável `PROVEDOR_NOTIFICACAO`:
  - **`simulado`** (padrão): só loga no console e grava a `Notificacao` no banco — não
    precisa de nenhuma credencial, é o que o seed e os testes usam.
  - **`real`**: e-mail de verdade via Nodemailer/SMTP; WhatsApp via um webhook HTTP
    genérico (`WHATSAPP_API_URL`, `POST {to, message}`) — qualquer provedor que aceite
    esse formato funciona, sem acoplar a uma API específica. Se a API de WhatsApp não
    estiver contratada/configurada, a notificação por WhatsApp fica com status `FALHA`
    (motivo registrado), sem derrubar a requisição nem o e-mail.
- Se o cliente não tiver e-mail nem telefone cadastrado, a resposta do `PATCH .../status`
  vem com `alertaRecepcao: true` para a tela avisar que alguém precisa ligar. Na
  prática esse caminho é mais difícil de reproduzir ao vivo porque `telefone` é campo
  obrigatório no cadastro de cliente desde a Sprint 1 — ver
  [pendências](#pendências-conhecidas).

### Encerramento, pagamento e baixa de estoque (RF12/RF14, PB16/PB17)

- `POST /api/ordens/:id/encerrar` `{ formaPagamento, parcelado?, numeroParcelas? }` —
  só com a OS em `PRONTO_PARA_RETIRADA`; só Recepcionista e Administrador.
- Cobra só os itens com `aprovado: true` (nunca os de um orçamento reprovado ou os
  itens não selecionados numa aprovação parcial). Sem itens aprovados, `400`.
- `parcelado: true` gera as parcelas (`numeroParcelas`, 2 a 24) com vencimento a cada
  30 dias, sobra de centavos jogada na última parcela
  (`shared/dinheiro.js#dividirEmParcelas`); sem parcelamento, a conta já nasce `PAGA`
  à vista, sem parcelas.
- Baixa de estoque (PB17): para cada item de peça aprovado, decrementa `Peca.quantidade`
  e grava uma `MovimentacaoEstoque` (tipo `SAIDA`) com o número da OS. Saldo
  insuficiente bloqueia com `409` **antes** de gravar qualquer coisa — checado uma vez
  no service (feedback rápido) e de novo dentro da transação do repositório (a que
  vale contra corrida de duas OS baixando a mesma peça ao mesmo tempo).
- Baixa de estoque + conta/parcelas + mudança de status para `ENCERRADA` acontecem na
  mesma transação Prisma (`ordens.repository.js#encerrarComPagamentoEBaixa`): se
  qualquer peça não tiver saldo, nada é gravado.
- `GET /api/ordens/:id/recibo` — recibo simples em PDF (gerado na hora com `pdfkit`,
  não fica salvo em disco), só depois que a OS está `ENCERRADA`.

### Agenda (RF05)

- `GET /api/agenda?data=YYYY-MM-DD` — agendamentos do dia (visão por dia).
- `POST /api/agenda` — agenda um atendimento (Recepcionista e Administrador).
- `PATCH /api/agenda/:id/reagendar` — muda a data/hora e marca o status como
  `REAGENDADO`.
- `PATCH /api/agenda/:id/cancelar` — marca como `CANCELADO`, o que libera o horário
  (não entra mais na contagem de boxes ocupados).
- Limite de boxes por horário configurável por `LIMITE_BOXES_POR_HORARIO` (padrão 3).
  Quando o horário pedido está cheio, a resposta é `409` com
  `{ message, sugestoes: [...] }` — os 3 próximos horários livres dentro do expediente
  (segunda a sábado, 8h–18h, RNF07), em slots de 30 minutos.

### Peças e alerta de estoque mínimo (RF13, RF15/PB18)

- `GET /api/pecas?busca=` — lista/busca por código ou descrição (qualquer perfil
  autenticado; usada no orçamento da OS).
- `POST /api/pecas` / `PATCH /api/pecas/:id` / `PATCH /api/pecas/:id/ativo` — exclusivo
  do Administrador.
- Código duplicado é bloqueado (409). Preço de venda menor que o preço de custo não é
  bloqueado, mas exige confirmação: a resposta é `409` com `avisos`, igual ao fluxo de
  abertura de OS, e `ignorarAvisos: true` confirma o cadastro/alteração mesmo assim.
- `GET /api/pecas/alertas` (Administrador) — peças ativas com `quantidade <=
  quantidadeMinima`. Não existe uma tabela de alertas: a lista é recalculada a cada
  chamada a partir do saldo atual, então uma peça "resolve sozinha" o alerta assim que
  o saldo volta a subir acima do mínimo (reposição de estoque, por exemplo) — não tem
  nada para marcar como resolvido manualmente.

### Financeiro (RF16/PB19)

- `GET /api/financeiro?tipo=&status=` — lista contas a pagar/receber (Administrador).
  Cada conta vem com um campo `vencida` calculado na hora (`status === 'ABERTA'` e
  vencimento no passado) — não é um status gravado, então não existe job nenhum para
  manter isso em dia.
- `POST /api/financeiro` — lança uma conta manual (fornecedor é opcional; usado em
  contas a pagar). As contas a receber de uma OS são geradas automaticamente pelo
  encerramento (PB16), não por aqui.
- `PATCH /api/financeiro/:id` / `DELETE /api/financeiro/:id` — edita ou exclui uma
  conta ainda não paga; contas geradas por uma OS não podem ser excluídas.
- `PATCH /api/financeiro/:id/baixa` `{ valorPago, pagaEm? }` — registra o pagamento
  (data e valor pago, que podem diferir do valor original) e muda o status para `PAGA`.
- `GET /api/financeiro/fluxo-caixa?inicio=&fim=` — soma de entradas (contas a receber
  pagas) e saídas (contas a pagar pagas) dentro do período, total e por dia, em
  centavos por baixo (`shared/dinheiro.js`) para não acumular erro de arredondamento.

### Relatórios (RF17/RNF13, PB20)

- `GET /api/relatorios/faturamento?inicio=&fim=&formato=json|pdf|xlsx` — OS encerradas
  no período: quantidade, faturamento total (soma dos itens aprovados — o que foi
  cobrado, não necessariamente já recebido; isso é o fluxo de caixa) e ticket médio.
- `GET /api/relatorios/desempenho?inicio=&fim=&formato=json|pdf|xlsx` — OS encerradas
  no período agrupadas por mecânico responsável (`OrdemServico.mecanicoId`, definido
  quando o mecânico finaliza o orçamento — ver seção de orçamento acima), com a
  quantidade de OS e o total de mão de obra cobrado por cada um.
- Os dois endpoints são exclusivos do Administrador e aceitam `formato=pdf` ou
  `formato=xlsx` para baixar o relatório pronto (`relatorios.exportacao.js`, com
  `pdfkit`/`ExcelJS`) em vez do JSON — o front usa isso direto num link de download.

## Frontend (rotas)

A aplicação sobe em `http://localhost:5173`.

- `/login` — tela de login (pública).
- `/` — início (exige login).
- `/clientes`, `/clientes/:id` — cadastro de clientes e, dentro do detalhe, os
  veículos daquele cliente (exige perfil Recepcionista ou Administrador).
- `/ordens/abrir` — busca o veículo pela placa e abre a OS com o checklist de entrada
  na mesma tela (exige perfil Recepcionista ou Administrador).
- `/ordens/historico` — consulta o histórico de OS de um veículo pela placa (qualquer
  perfil logado).
- `/ordens/painel` — painel Kanban por status; mover card (Em execução ⇄ Aguardando
  peça ⇄ Pronto) só aparece para Mecânico e Administrador (qualquer perfil logado
  pode ver o painel).
- `/ordens/:id` — detalhe da OS: checklist, orçamento (editável só com a OS Aberta e
  perfil Mecânico/Administrador), decisão do cliente (Recepcionista/Administrador),
  atalhos de status, notificações enviadas, histórico e, depois de encerrada,
  pagamento/parcelas e link para o recibo em PDF.
- `/agenda` — visão por dia da agenda, com agendar/reagendar/cancelar (exige perfil
  Recepcionista ou Administrador).
- `/pecas` — lista e busca de peças, com alerta de estoque mínimo no topo para o
  Administrador; cadastrar/editar/inativar só aparece para o Administrador (qualquer
  perfil logado pode consultar).
- `/financeiro` — contas a pagar/receber, baixa de pagamento e fluxo de caixa (exige
  perfil Administrador).
- `/relatorios` — faturamento, ticket médio e desempenho por mecânico por período,
  com exportação em PDF/XLSX (exige perfil Administrador).
- `/funcionarios` — cadastro de funcionários (exige perfil Administrador).

O menu no topo só mostra os itens que o perfil logado pode acessar. Se a sessão
expirar, qualquer chamada à API que volte 401 desloga o usuário e mostra o aviso de
sessão expirada na tela de login.

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
  consultar a tabela de clientes direto — mantém as camadas isoladas (RNF14). A única
  exceção documentada é `ordens.repository.js` → `pecasRepository` na baixa de
  estoque, explicada abaixo.
- **Sessão com renovação deslizante**: em vez de um token com validade fixa desde o
  login, o middleware `authenticate` reemite o cookie a cada requisição autenticada,
  com nova validade de 30 min — é isso que implementa "expira após 30 min de
  inatividade".
- **Mensagens de erro de login genéricas** ("E-mail ou senha incorretos.") tanto para
  e-mail inexistente quanto para senha errada, para não revelar quais e-mails estão
  cadastrados.
- **Permissões por módulo**: leitura de clientes/veículos liberada para qualquer
  perfil autenticado (um mecânico pode precisar consultar um cliente); escrita
  restrita a Recepcionista e Administrador; tudo em funcionários, financeiro e
  relatórios é exclusivo do Administrador. Isso não estava 100% especificado no
  prompt da sprint — foi uma escolha razoável, documentada aqui para o time revisar.
- **`AvisosConfirmacaoError`/`HorarioLotadoError` (`shared/errors.js`)**: erros `409`
  genéricos para o padrão "a ação pode seguir, mas o usuário precisa confirmar um
  aviso" (OS em andamento, km menor, preço de venda abaixo do custo, horário sem
  boxes livres). O service recebe de volta um `ignorarAvisos`/retenta com o horário
  sugerido para seguir em frente — evita reimplementar essa regra em cada módulo.
- **Checklist de entrada guardado como JSON em colunas de texto**: `avarias` e
  `itensPresentes` são listas de tamanho variável; em vez de criar tabelas à parte só
  para isso, elas são serializadas com `JSON.stringify` em colunas `String?`.
- **Limite de boxes por horário fixo por slot, não por recurso**: a agenda não modela
  "boxes" como entidade — é só uma constante (`LIMITE_BOXES_POR_HORARIO`) comparada
  contra a contagem de agendamentos ativos no mesmo horário. Simples o bastante para
  o escopo do projeto; se a oficina precisar de boxes com características diferentes
  (elevador, alinhamento etc.), isso vira um modelo próprio depois.
- **Decisão do orçamento gravada direto na OS, não numa tabela à parte**: só existe
  uma decisão corrente por orçamento (o diagrama de estados não prevê reabrir depois
  de aprovado/reprovado), então `decisaoOrcamento`/`meioContatoDecisao`/
  `motivoReprovacao`/`decisaoRegistradaEm` ficam em `OrdemServico`. O histórico da
  transição em si (quando, quem) já está em `HistoricoStatusOS`.
- **Matemática de dinheiro em centavos (`shared/dinheiro.js`)**: todo total de
  orçamento, parcela e lançamento financeiro é calculado convertendo para centavos
  (inteiros) antes de somar/dividir, para não acumular erro de ponto flutuante
  (`0.1 + 0.2 !== 0.3` em JS puro) nem fechar parcelas com sobra/falta de centavo — a
  diferença de arredondamento vai inteira para a última parcela.
- **`encerrarComPagamentoEBaixa` acessa `pecasRepository` direto, não `pecasService`**:
  é a única exceção à regra "módulo só acessa outro módulo pelo service" do projeto.
  Motivo: PB17 exige que a baixa de estoque e o encerramento da OS aconteçam na
  *mesma transação* Prisma (se uma peça não tiver saldo, nada é gravado, nem a
  mudança de status). Isso só é possível se as duas operações usarem o mesmo client
  de transação (`tx`), e só os repositories recebem `tx` — os services não. Por isso
  `ordens.repository.js` chama `pecasRepository.darBaixaEstoque(tx, ...)`
  diretamente, mantendo a regra geral para tudo que não precisa ser atômico entre
  módulos.
- **Checagem de saldo em dois pontos**: `ordens.service.js` confere o saldo de cada
  peça *antes* de abrir a transação (erro rápido e claro para o usuário, sem gastar
  uma transação à toa); `ordens.repository.js` confere de novo *dentro* da transação,
  com os dados mais recentes — essa segunda é a que realmente protege contra duas OS
  baixando a mesma peça ao mesmo tempo.
- **Recibo e relatórios em PDF/XLSX gerados na hora, sem salvar em disco**: tanto o
  recibo da OS quanto os relatórios de faturamento/desempenho são montados a partir
  dos dados já carregados a cada chamada (`pdfkit`/`ExcelJS`). Mais simples que
  gerenciar um diretório de arquivos, e o custo de gerar de novo a cada download é
  desprezível para documentos desse tamanho.
- **Notificação com provedor simulado por padrão, trocável por `.env`**: PB14 previa
  que a API de WhatsApp pudesse não estar contratada, então a interface
  (`notificacoes.provedores.js`) separa "o que enviar" (`notificacoes.service.js`) de
  "como enviar de verdade" — o provedor real de WhatsApp é um webhook HTTP genérico
  em vez de uma API específica, para não acoplar a um fornecedor.
- **Alertas de peça e de conta vencida nunca são gravados, só calculados na leitura**:
  tanto `pecaEmAlerta` (PB18) quanto `vencida` (PB19) são campos derivados calculados
  a cada chamada, não colunas no banco — evita precisar de um job agendado para manter
  esses estados em dia e faz o "resolve sozinho" pedido no PB18 ser automático.
- **`mecanicoId` da OS definido ao finalizar o orçamento**: esse campo já existia no
  schema desde a Sprint 1, mas nenhum código gravava nele. Foi conectado nesta sprint
  porque o relatório de desempenho por mecânico (PB20) precisa saber quem é o
  responsável por cada OS — o momento mais natural para isso é quando o mecânico monta
  e finaliza o orçamento, não quando a OS é aberta (quem abre é a recepção) nem quando
  é encerrada (quem encerra também é a recepção).

## Documentos do projeto (`docs/`)

- `Overdrive_Requisitos_e_Modelagem.docx` — requisitos (RF01–RF18, RNF01–RNF16) e
  modelagem UML/BPMN. Fonte de verdade.
- `Overdrive_Scrum_Planejamento.xlsx` — backlog do produto, backlog da sprint,
  cerimônias e apoio para o quadro no Trello.
- `ROTEIRO_DEMONSTRACAO.md` — roteiro de apresentação de 5 minutos, passo a passo,
  pensado para o conjunto de dados que o seed cria.

O diagrama de estados da OS no `.docx` define 7 estados, já usados no `schema.prisma`
(enum `StatusOrdemServico`):

```
Aberta → Aguardando Aprovação → (Reprovada [fim] | Em Execução)
Em Execução ⇄ Aguardando Peça → ... → Pronto para Retirada → Encerrada [fim]
```

Ou seja, não existe estado "Em Diagnóstico" (a OS vai direto de Aberta para a
elaboração do orçamento), o estado final de reprovação chama-se **Reprovada** (não
"Cancelada"), e "Aguardando Peça" é um estado próprio dentro da execução.

## Trabalho futuro

Combinado desde o início do projeto que ficariam fora das quatro sprints:

- **Backup automático diário do banco (RNF08)** — nenhum código ainda faz isso; hoje
  depende de backup manual do arquivo SQLite (ou do mecanismo do banco gerenciado, se
  o projeto migrar para PostgreSQL em produção).
- **Auditoria (RNF12, PB22)** — a tabela `Auditoria` existe no `schema.prisma` desde a
  Sprint 1 como ponto de extensão (entidade, ação, dados antes/depois, quem e quando),
  mas nenhum código grava registros nela ainda. Para implementar, o lugar mais natural
  seria um middleware ou um hook nos `service.js` que gravam/alteram/excluem OS,
  estoque e financeiro — exatamente os três domínios que a RNF12 pede.

Nenhuma dessas duas pendências bloqueia o uso do sistema; ficam documentadas aqui para
quem for continuar o projeto depois da disciplina.

## Pendências conhecidas

- As telas novas desta sprint (`Financeiro`, `Relatorios`, seções de notificação e
  alerta de estoque) só passaram por lint e `npm run build` — não houve checagem
  visual no navegador (extensão de browser não instalada neste ambiente). O backend
  foi testado de ponta a ponta via `curl` contra o seed de demonstração, inclusive
  conferindo que os valores dos relatórios batem com os dados (ver
  [Testes e cobertura](#testes-e-cobertura)). Vale uma conferência visual antes da
  apresentação.
- O alerta "cliente sem contato cadastrado" (PB14) existe e é testado no nível de
  service, mas não é reproduzível ao vivo pela tela: `telefone` é campo obrigatório no
  cadastro de cliente desde a Sprint 1, então nenhum cliente criado pela API chega sem
  nenhum contato. Ajustar exigiria tornar `telefone` opcional — uma mudança de
  validação da Sprint 1 fora do pedido desta sprint, por isso não foi feita sem
  confirmar com o time.
- Cobertura de teste (RNF15/PB21) está nos 70%+ exigidos para o escopo pedido
  (orçamento, estoque, financeiro — ver [Testes e cobertura](#testes-e-cobertura)),
  mas os módulos de Sprint 1 (`auth.service.js` está em 0%, `veiculos.service.js` em
  ~30%) ficaram de fora por não serem o alvo da meta — seriam o próximo passo natural
  se a meta de cobertura for estendida ao projeto inteiro.
- Checklist de avarias usa uma lista fixa de regiões do veículo (para-choque, portas,
  capô etc.) em vez de um diagrama clicável do carro — atende ao RF07, mas é mais
  simples do que um mapa visual (pendência carregada desde a Sprint 2).
- Sem campo de desconto no orçamento: não há nada nos requisitos (RF08) ou no backlog
  pedindo essa funcionalidade, então não foi criada.
- Backup automático e auditoria (RNF08/RNF12) — ver [Trabalho futuro](#trabalho-futuro).
- RNF01/RNF02 (tempo de resposta e carga) não foram medidos — o schema tem os índices
  necessários, mas não há teste de carga no projeto.
- Sem testes automatizados no frontend.
