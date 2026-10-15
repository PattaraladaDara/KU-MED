CREATE TABLE "MedicationDispense" (
    "id" TEXT NOT NULL,
    "treatmentRecordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "pharmacistUsername" TEXT,
    "pharmacistName" TEXT,
    "dispensedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedicationDispense_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicationDispense_treatmentRecordId_key" ON "MedicationDispense"("treatmentRecordId");
CREATE INDEX "MedicationDispense_status_updatedAt_idx" ON "MedicationDispense"("status", "updatedAt");
ALTER TABLE "MedicationDispense" ADD CONSTRAINT "MedicationDispense_treatmentRecordId_fkey" FOREIGN KEY ("treatmentRecordId") REFERENCES "TreatmentRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
