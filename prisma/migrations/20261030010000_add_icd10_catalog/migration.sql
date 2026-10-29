CREATE TABLE "Icd10CatalogEntry" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Icd10CatalogEntry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Icd10CatalogEntry_code_key" ON "Icd10CatalogEntry"("code");
CREATE INDEX "Icd10CatalogEntry_active_code_idx" ON "Icd10CatalogEntry"("active", "code");
