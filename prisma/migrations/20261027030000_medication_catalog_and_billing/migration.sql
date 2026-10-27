CREATE TABLE "MedicationCatalogItem" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "strength" TEXT NOT NULL,
  "dosageForm" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "unitPriceSatang" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MedicationCatalogItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MedicationCatalogItem_code_key" ON "MedicationCatalogItem"("code");
CREATE INDEX "MedicationCatalogItem_active_name_idx" ON "MedicationCatalogItem"("active", "name");

ALTER TABLE "Payment" ADD COLUMN "treatmentRecordId" TEXT;
CREATE UNIQUE INDEX "Payment_treatmentRecordId_key" ON "Payment"("treatmentRecordId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_treatmentRecordId_fkey"
  FOREIGN KEY ("treatmentRecordId") REFERENCES "TreatmentRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
