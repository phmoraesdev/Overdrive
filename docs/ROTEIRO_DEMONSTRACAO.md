# Roteiro de demonstração — Overdrive (5 minutos)

Pré-requisito: backend e frontend rodando (ver README), com `npm run prisma:seed`
já executado — o seed cria 4 funcionários, 6 clientes, 8 veículos, 4 peças e
**8 OS em 8 estágios diferentes do ciclo** (uma pronta para cada parte deste
roteiro), além de agenda, financeiro e notificações de exemplo.

Para simplificar a demonstração, entre uma vez como **Administrador**
(`admin@overdrive.com` / `Admin@123`) — esse perfil tem acesso a tudo, então
não é preciso trocar de login no meio da apresentação. Vale **mencionar**
que, no dia a dia, cada etapa é feita pelo perfil dono dela (recepção abre a
OS e encerra; mecânico monta o orçamento e muda o status; administrador cuida
de peças, financeiro e relatórios) — o menu no topo muda de acordo com quem
está logado.

| # | Tempo | Tela | O que mostrar |
|---|-------|------|----------------|
| 1 | 0:00–0:20 | **Login** | Entrar como Administrador. Comentar rapidamente os 3 perfis (Recepção, Mecânico, Administrador) e que o menu muda conforme quem loga. |
| 2 | 0:20–0:40 | **Clientes** → **Abrir OS** | Cadastrar um cliente novo rápido (ex.: nome, CPF, telefone) e um veículo para ele — mostra o CRUD básico (Sprint 1) sem se alongar. |
| 3 | 0:40–1:20 | **Abrir OS** | Buscar o veículo recém-cadastrado pela placa, preencher km e problema relatado, marcar o checklist (combustível, itens presentes, uma avaria) e abrir a OS — tudo numa tela só, sem navegar (RNF03). Também vale buscar a placa `ABC1234` para mostrar o aviso de **"OS em andamento"** (ela já tem uma OS aberta no seed). |
| 4 | 1:20–1:45 | **Painel de OS** | Mostrar o quadro Kanban com as 8 OS do seed espalhadas pelos status (Aberta, Aguardando aprovação, Em execução, Aguardando peça, Pronto). Comentar que o mecânico move os cards daqui mesmo. |
| 5 | 1:45–2:30 | **Detalhe da OS nº 2** (Aguardando aprovação, Maria Oliveira / ABC1D23) | Abrir pelo painel ou pelo histórico. Mostrar o orçamento já montado (óleo + mão de obra), registrar a decisão do cliente como **Aprovado** (meio de contato: Telefone) — a OS vai para Em execução. |
| 6 | 2:30–3:10 | **Detalhe da OS nº 4** (Aguardando peça, Carlos Pereira / JJS2D45) | Mudar o status para **Em execução** ("peça chegou") e depois para **Pronto para retirada** — mostrar a seção de **Notificações** preenchendo na hora (e-mail + WhatsApp simulados, com o nº da OS na mensagem). |
| 7 | 3:10–3:50 | **Detalhe da OS nº 4** (agora Pronto) | Encerrar a OS: escolher forma de pagamento (ex.: Pix à vista, ou Cartão parcelado em 2x para mostrar as parcelas). Mostrar o card de pagamento aparecendo e abrir o **recibo em PDF**. |
| 8 | 3:50–4:10 | **Peças** | Mostrar o alerta de estoque mínimo no topo da tela (Pastilha de freio, abaixo do mínimo) — e que ele não precisa de nenhuma ação manual para aparecer. |
| 9 | 4:10–4:35 | **Financeiro** | Mostrar a conta "Aluguel do galpão" vencida, o fluxo de caixa do mês (entradas das OS encerradas x saída da conta de luz já paga) e registrar a baixa de uma conta a pagar. |
| 10 | 4:35–5:00 | **Relatórios** | Gerar o relatório de **Faturamento** e **Desempenho por mecânico** do mês (Marcos e Bruno aparecem com valores diferentes) e clicar em **Exportar PDF** ou **XLSX** para mostrar o arquivo abrindo. |

## Se sobrar tempo

- Mostrar a **Agenda** (3 atendimentos de exemplo, hoje e amanhã) e reagendar um deles para ver a sugestão de horários livres.
- Abrir a OS nº 3 (Maria Oliveira / XYZ9876) para mostrar uma **aprovação parcial**: o orçamento tinha uma pastilha de freio que o cliente recusou, e só o resto entrou no total.
- Abrir a OS nº 8 (reprovada) para mostrar o motivo da reprovação registrado.

## Se algo não sair como esperado

- Se uma tela parecer vazia, confirme que `npm run prisma:seed` rodou depois do último `prisma migrate reset`/banco novo.
- O painel e os relatórios recalculam tudo na hora a partir do banco — não há cache para limpar.
- Os números exatos do faturamento/desempenho dependem só dos dados do seed (documentados no README) e não mudam de uma execução para outra, a menos que o roteiro acima já tenha sido seguido (nesse caso a OS recém-aberta no passo 3 também passa a contar).
