ALTER TABLE "TreatmentRecord" ADD COLUMN "triageAssessmentId" TEXT;
CREATE UNIQUE INDEX "TreatmentRecord_triageAssessmentId_key" ON "TreatmentRecord"("triageAssessmentId");
ALTER TABLE "TreatmentRecord" ADD CONSTRAINT "TreatmentRecord_triageAssessmentId_fkey" FOREIGN KEY ("triageAssessmentId") REFERENCES "TriageAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
