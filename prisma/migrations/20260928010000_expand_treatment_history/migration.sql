ALTER TABLE "TreatmentRecord"
ADD COLUMN "visitNumber" TEXT,
ADD COLUMN "temperature" DOUBLE PRECISION,
ADD COLUMN "bloodPressure" TEXT,
ADD COLUMN "pulse" INTEGER,
ADD COLUMN "oxygenSaturation" INTEGER,
ADD COLUMN "weightKg" DOUBLE PRECISION,
ADD COLUMN "heightCm" DOUBLE PRECISION,
ADD COLUMN "chiefComplaint" TEXT,
ADD COLUMN "diagnosisCode" TEXT,
ADD COLUMN "diagnosisName" TEXT,
ADD COLUMN "treatmentPlan" TEXT,
ADD COLUMN "medicationOrders" TEXT;

ALTER TABLE "TreatmentRecord"
ADD CONSTRAINT "TreatmentRecord_oxygenSaturation_check" CHECK ("oxygenSaturation" IS NULL OR "oxygenSaturation" BETWEEN 0 AND 100),
ADD CONSTRAINT "TreatmentRecord_pulse_check" CHECK ("pulse" IS NULL OR "pulse" > 0),
ADD CONSTRAINT "TreatmentRecord_temperature_check" CHECK ("temperature" IS NULL OR "temperature" BETWEEN 25 AND 50);
