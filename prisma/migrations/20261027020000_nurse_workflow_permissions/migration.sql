ALTER TABLE "TreatmentRecord"
  ADD COLUMN "createdByUsername" TEXT,
  ADD COLUMN "createdByName" TEXT,
  ADD COLUMN "createdByRole" TEXT;

ALTER TABLE "Payment"
  ADD COLUMN "createdByUsername" TEXT,
  ADD COLUMN "createdByName" TEXT,
  ADD COLUMN "createdByRole" TEXT;

ALTER TABLE "MedicationDispense" ADD COLUMN "operatorRole" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reviewedByRole" TEXT;
