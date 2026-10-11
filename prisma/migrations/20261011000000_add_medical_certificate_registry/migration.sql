CREATE TABLE "CertificateSequence" (
    "buddhistYear" INTEGER NOT NULL,
    "nextNumber" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CertificateSequence_pkey" PRIMARY KEY ("buddhistYear")
);

CREATE TABLE "MedicalCertificate" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "treatmentRecordId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'ใบรับรองการเจ็บป่วย',
    "examinedAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restStartDate" TIMESTAMP(3) NOT NULL,
    "restEndDate" TIMESTAMP(3) NOT NULL,
    "restDays" INTEGER NOT NULL,
    "doctorName" TEXT NOT NULL,
    "medicalLicense" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "symptom" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "medicalOpinion" TEXT NOT NULL,
    "templateVersion" TEXT NOT NULL DEFAULT 'illness-v1',
    "contentSnapshot" JSONB NOT NULL,
    "documentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "printCount" INTEGER NOT NULL DEFAULT 0,
    "lastPrintedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MedicalCertificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MedicalCertificate_certificateNumber_key" ON "MedicalCertificate"("certificateNumber");
CREATE INDEX "MedicalCertificate_patientId_issuedAt_idx" ON "MedicalCertificate"("patientId", "issuedAt");
CREATE INDEX "MedicalCertificate_treatmentRecordId_issuedAt_idx" ON "MedicalCertificate"("treatmentRecordId", "issuedAt");
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_treatmentRecordId_fkey" FOREIGN KEY ("treatmentRecordId") REFERENCES "TreatmentRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MedicalCertificate" ADD CONSTRAINT "MedicalCertificate_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "StaffAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
