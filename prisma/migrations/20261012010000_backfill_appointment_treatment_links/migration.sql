-- Link legacy treatment records to completed appointments for the same patient
-- and Bangkok calendar day. Only mutually nearest records are paired so an
-- unrelated visit on the same day is not selected when the match is unclear.
WITH legacy_appointments AS (
  SELECT
    a."id",
    a."patientId",
    a."scheduledAt",
    a."reason",
    (a."scheduledAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date AS service_date
  FROM "Appointment" a
  WHERE a."status" = 'completed'
),
legacy_treatments AS (
  SELECT
    t."id",
    t."patientId",
    t."visitedAt",
    (t."visitedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date AS service_date
  FROM "TreatmentRecord" t
  WHERE t."appointmentId" IS NULL
    AND t."visitSource" = 'legacy'
),
candidates AS (
  SELECT
    t."id" AS treatment_id,
    a."id" AS appointment_id,
    a."reason" AS appointment_reason,
    a."scheduledAt" AS appointment_scheduled_at,
    row_number() OVER (
      PARTITION BY a."id"
      ORDER BY abs(extract(epoch FROM (t."visitedAt" - a."scheduledAt"))), t."id"
    ) AS appointment_choice,
    row_number() OVER (
      PARTITION BY t."id"
      ORDER BY abs(extract(epoch FROM (t."visitedAt" - a."scheduledAt"))), a."id"
    ) AS treatment_choice
  FROM legacy_treatments t
  INNER JOIN legacy_appointments a
    ON a."patientId" = t."patientId"
   AND a.service_date = t.service_date
),
matched_records AS (
  SELECT treatment_id, appointment_id, appointment_reason, appointment_scheduled_at
  FROM candidates
  WHERE appointment_choice = 1 AND treatment_choice = 1
)
UPDATE "TreatmentRecord" t
SET
  "appointmentId" = matched_records.appointment_id,
  "visitSource" = 'appointment',
  "appointmentReason" = matched_records.appointment_reason,
  "appointmentScheduledAt" = matched_records.appointment_scheduled_at
FROM matched_records
WHERE t."id" = matched_records.treatment_id;
