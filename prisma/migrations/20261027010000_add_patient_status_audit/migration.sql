CREATE TABLE "PatientStatusChange" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changedByUsername" TEXT NOT NULL,
    "changedByName" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PatientStatusChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PatientStatusChange_patientId_changedAt_idx"
ON "PatientStatusChange"("patientId", "changedAt");

ALTER TABLE "PatientStatusChange"
ADD CONSTRAINT "PatientStatusChange_patientId_fkey"
FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
ON DELETE CASCADE ON UPDATE CASCADE;