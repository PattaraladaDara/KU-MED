ALTER TABLE "Evaluation"
ADD COLUMN "externalFormId" TEXT,
ADD COLUMN "externalResponseId" TEXT,
ADD COLUMN "sourceAnswers" JSONB,
ADD COLUMN "sourceSubmittedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Evaluation_externalResponseId_key" ON "Evaluation"("externalResponseId");

CREATE TABLE "GoogleFormConnection" (
    "id" TEXT NOT NULL DEFAULT 'service-evaluation',
    "formId" TEXT NOT NULL,
    "formUrl" TEXT NOT NULL,
    "sheetCsvUrl" TEXT NOT NULL,
    "title" TEXT,
    "revisionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastSchemaSyncAt" TIMESTAMP(3),
    "lastResponseSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GoogleFormConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GoogleFormQuestion" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "metricKey" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoogleFormQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GoogleFormConnection_formId_key" ON "GoogleFormConnection"("formId");
CREATE UNIQUE INDEX "GoogleFormQuestion_connectionId_questionId_key" ON "GoogleFormQuestion"("connectionId", "questionId");
CREATE INDEX "GoogleFormQuestion_connectionId_active_idx" ON "GoogleFormQuestion"("connectionId", "active");
CREATE INDEX "GoogleFormQuestion_connectionId_metricKey_idx" ON "GoogleFormQuestion"("connectionId", "metricKey");
ALTER TABLE "GoogleFormQuestion" ADD CONSTRAINT "GoogleFormQuestion_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "GoogleFormConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
