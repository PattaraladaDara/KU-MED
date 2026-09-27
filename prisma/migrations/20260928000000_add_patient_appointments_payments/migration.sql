CREATE TABLE "Appointment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "department" TEXT NOT NULL,
  "clinician" TEXT,
  "reason" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Appointment_patientId_scheduledAt_idx" ON "Appointment"("patientId", "scheduledAt");
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "referenceCode" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amountSatang" INTEGER NOT NULL,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'paid',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Payment_amountSatang_check" CHECK ("amountSatang" >= 0)
);
CREATE UNIQUE INDEX "Payment_referenceCode_key" ON "Payment"("referenceCode");
CREATE INDEX "Payment_patientId_paidAt_idx" ON "Payment"("patientId", "paidAt");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
