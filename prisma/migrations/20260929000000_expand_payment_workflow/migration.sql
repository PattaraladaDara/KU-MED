ALTER TABLE "Payment"
  ADD COLUMN "receiptNumber" TEXT,
  ADD COLUMN "receivedSatang" INTEGER,
  ADD COLUMN "changeSatang" INTEGER,
  ADD COLUMN "qrPayload" TEXT,
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "slipFileName" TEXT,
  ADD COLUMN "slipMimeType" TEXT,
  ADD COLUMN "slipData" BYTEA;

CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_receivedSatang_check" CHECK ("receivedSatang" IS NULL OR "receivedSatang" >= 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_changeSatang_check" CHECK ("changeSatang" IS NULL OR "changeSatang" >= 0);
