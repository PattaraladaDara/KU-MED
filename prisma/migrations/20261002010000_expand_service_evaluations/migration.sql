ALTER TABLE "Evaluation"
ADD COLUMN "systemScores" JSONB,
ADD COLUMN "personnelScores" JSONB,
ADD COLUMN "organizationScores" JSONB,
ADD COLUMN "serviceUnit" TEXT,
ADD COLUMN "serviceType" TEXT,
ADD COLUMN "visitorType" TEXT,
ADD COLUMN "accessType" TEXT,
ADD COLUMN "waitTimeRange" TEXT,
ADD COLUMN "problemStage" TEXT,
ADD COLUMN "problemDetails" TEXT,
ADD COLUMN "improvementSuggestion" TEXT,
ADD COLUMN "desiredService" TEXT,
ADD COLUMN "returnIntention" INTEGER,
ADD COLUMN "recommendationScore" INTEGER,
ADD COLUMN "anonymous" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "followupStatus" TEXT NOT NULL DEFAULT 'received';

ALTER TABLE "Evaluation"
ADD CONSTRAINT "Evaluation_returnIntention_check" CHECK ("returnIntention" IS NULL OR "returnIntention" BETWEEN 1 AND 5),
ADD CONSTRAINT "Evaluation_recommendationScore_check" CHECK ("recommendationScore" IS NULL OR "recommendationScore" BETWEEN 0 AND 10);

CREATE INDEX "Evaluation_serviceUnit_createdAt_idx" ON "Evaluation"("serviceUnit", "createdAt");
CREATE INDEX "Evaluation_followupStatus_createdAt_idx" ON "Evaluation"("followupStatus", "createdAt");
