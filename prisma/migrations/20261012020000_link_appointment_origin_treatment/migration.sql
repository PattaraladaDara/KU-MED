-- Record which treatment visit created a follow-up appointment.
ALTER TABLE "Appointment"
ADD COLUMN "originTreatmentId" TEXT;

CREATE INDEX "Appointment_originTreatmentId_idx"
ON "Appointment"("originTreatmentId");

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_originTreatmentId_fkey"
FOREIGN KEY ("originTreatmentId") REFERENCES "TreatmentRecord"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill old appointments from the nearest preceding treatment belonging to
-- the same patient on the Bangkok calendar day when the appointment was made.
WITH candidates AS (
  SELECT
    a."id" AS appointment_id,
    t."id" AS treatment_id,
    row_number() OVER (
      PARTITION BY a."id"
      ORDER BY (a."createdAt" - t."visitedAt"), t."id"
    ) AS candidate_rank
  FROM "Appointment" a
  INNER JOIN "TreatmentRecord" t
    ON t."patientId" = a."patientId"
   AND t."visitedAt" <= a."createdAt"
   AND (t."visitedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date
       = (a."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date
  WHERE a."originTreatmentId" IS NULL
)
UPDATE "Appointment" a
SET "originTreatmentId" = candidates.treatment_id
FROM candidates
WHERE a."id" = candidates.appointment_id
  AND candidates.candidate_rank = 1;
