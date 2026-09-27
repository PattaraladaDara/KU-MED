CREATE TABLE "ApplicationMetadata" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ApplicationMetadata_pkey" PRIMARY KEY ("key")
);

INSERT INTO "ApplicationMetadata" ("key", "value", "updatedAt")
VALUES ('project', 'KU-MED', CURRENT_TIMESTAMP);
