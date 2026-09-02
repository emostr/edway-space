-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "variant" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Test" ADD COLUMN     "variantCount" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "Work" ADD COLUMN     "variant" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Question_testId_variant_idx" ON "Question"("testId", "variant");
