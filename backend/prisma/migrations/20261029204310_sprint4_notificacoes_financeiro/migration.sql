-- AlterTable
ALTER TABLE "Conta" ADD COLUMN "fornecedor" TEXT;
ALTER TABLE "Conta" ADD COLUMN "valorPago" DECIMAL;

-- CreateTable
CREATE TABLE "Notificacao" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "canal" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "erro" TEXT,
    "enviadaEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ordemServicoId" TEXT NOT NULL,
    CONSTRAINT "Notificacao_ordemServicoId_fkey" FOREIGN KEY ("ordemServicoId") REFERENCES "OrdemServico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Notificacao_ordemServicoId_idx" ON "Notificacao"("ordemServicoId");
