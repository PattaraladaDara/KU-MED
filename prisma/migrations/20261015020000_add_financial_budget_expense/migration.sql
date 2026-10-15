CREATE TABLE "FinancialBudget" (
    "id" TEXT NOT NULL,
    "fiscalYear" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "allocatedSatang" INTEGER NOT NULL,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialBudget_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FinancialExpense" (
    "id" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "referenceCode" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payee" TEXT NOT NULL,
    "amountSatang" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FinancialExpense_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinancialBudget_fiscalYear_category_key" ON "FinancialBudget"("fiscalYear", "category");
CREATE INDEX "FinancialBudget_fiscalYear_idx" ON "FinancialBudget"("fiscalYear");
CREATE UNIQUE INDEX "FinancialExpense_referenceCode_key" ON "FinancialExpense"("referenceCode");
CREATE INDEX "FinancialExpense_expenseDate_idx" ON "FinancialExpense"("expenseDate");
CREATE INDEX "FinancialExpense_status_expenseDate_idx" ON "FinancialExpense"("status", "expenseDate");
CREATE INDEX "FinancialExpense_category_expenseDate_idx" ON "FinancialExpense"("category", "expenseDate");
