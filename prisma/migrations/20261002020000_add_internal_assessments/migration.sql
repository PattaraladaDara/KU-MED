ALTER TABLE "Evaluation"
ADD COLUMN "assessmentType" TEXT,
ADD COLUMN "assessedUserKey" TEXT,
ADD COLUMN "assessedName" TEXT,
ADD COLUMN "assessedRole" TEXT,
ADD COLUMN "commonScores" JSONB,
ADD COLUMN "roleScores" JSONB,
ADD COLUMN "strengths" TEXT,
ADD COLUMN "developmentGoals" TEXT,
ADD COLUMN "supportNeeded" TEXT,
ADD COLUMN "actionPlan" TEXT,
ADD COLUMN "reviewDate" TIMESTAMP(3);

CREATE INDEX "Evaluation_assessedUserKey_createdAt_idx" ON "Evaluation"("assessedUserKey", "createdAt");
