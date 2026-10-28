CREATE TABLE "FinancialExpenseStatusHistory" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "fromStatus" TEXT NOT NULL,
    "toStatus" TEXT NOT NULL,
    "actorUsername" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FinancialExpenseStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialExpenseStatusHistory_expenseId_createdAt_idx"
ON "FinancialExpenseStatusHistory"("expenseId", "createdAt");

ALTER TABLE "FinancialExpenseStatusHistory"
ADD CONSTRAINT "FinancialExpenseStatusHistory_expenseId_fkey"
FOREIGN KEY ("expenseId") REFERENCES "FinancialExpense"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FinancialExpenseStatusHistory" (
    "id", "expenseId", "fromStatus", "toStatus", "actorUsername", "actorName", "note", "createdAt"
)
SELECT
    'legacy-' || "id", "id", 'legacy', "status", "createdBy", "createdBy",
    'สถานะเดิม ณ วันที่เริ่มจัดเก็บประวัติ', "updatedAt"
FROM "FinancialExpense";
