-- Preserve the source of each visit and link an appointment to its resulting
-- treatment record. Existing records are marked as legacy because their source
-- cannot be inferred safely.
ALTER TABLE "TreatmentRecord"
ADD COLUMN "appointmentId" TEXT,
ADD COLUMN "visitSource" TEXT NOT NULL DEFAULT 'legacy',
ADD COLUMN "appointmentReason" TEXT,
ADD COLUMN "appointmentScheduledAt" TIMESTAMP(3);

ALTER TABLE "TreatmentRecord"
ALTER COLUMN "visitSource" SET DEFAULT 'walk_in';

CREATE UNIQUE INDEX "TreatmentRecord_appointmentId_key"
ON "TreatmentRecord"("appointmentId");

CREATE INDEX "TreatmentRecord_visitSource_visitedAt_idx"
ON "TreatmentRecord"("visitSource", "visitedAt");

ALTER TABLE "TreatmentRecord"
ADD CONSTRAINT "TreatmentRecord_appointmentId_fkey"
FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
