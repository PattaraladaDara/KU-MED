-- Older datetime-local values were stored as if they were UTC. They represent
-- Bangkok wall-clock time, so normalize them to UTC once before displaying
-- them with the Asia/Bangkok timezone.
UPDATE "TreatmentRecord"
SET "visitedAt" = "visitedAt" - INTERVAL '7 hours';

UPDATE "Appointment"
SET
  "scheduledAt" = "scheduledAt" - INTERVAL '7 hours',
  "endsAt" = CASE
    WHEN "endsAt" IS NULL THEN NULL
    ELSE "endsAt" - INTERVAL '7 hours'
  END;
