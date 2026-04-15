-- CreateTable
CREATE TABLE IF NOT EXISTS "Household" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Household_inviteCode_key" ON "Household"("inviteCode");

-- Seed default household for existing data
INSERT INTO "Household" ("name", "inviteCode")
SELECT 'Моя семья', 'DEFAULT1'
WHERE NOT EXISTS (SELECT 1 FROM "Household" WHERE "inviteCode" = 'DEFAULT1');

-- AlterTable User — add householdId (nullable first)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "householdId" INTEGER;
UPDATE "User" SET "householdId" = (SELECT "id" FROM "Household" WHERE "inviteCode" = 'DEFAULT1') WHERE "householdId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "householdId" SET NOT NULL;

-- AlterTable Category — add householdId (nullable first)
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "householdId" INTEGER;
UPDATE "Category" SET "householdId" = (SELECT "id" FROM "Household" WHERE "inviteCode" = 'DEFAULT1') WHERE "householdId" IS NULL;
ALTER TABLE "Category" ALTER COLUMN "householdId" SET NOT NULL;

-- Drop old unique constraint on Category.name, create composite one
ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_name_key";
DROP INDEX IF EXISTS "Category_name_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_householdId_key" ON "Category"("name", "householdId");

-- AlterTable Expense — add householdId (nullable first)
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "householdId" INTEGER;
UPDATE "Expense" SET "householdId" = (SELECT "id" FROM "Household" WHERE "inviteCode" = 'DEFAULT1') WHERE "householdId" IS NULL;
ALTER TABLE "Expense" ALTER COLUMN "householdId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_householdId_fkey";
ALTER TABLE "User" ADD CONSTRAINT "User_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Category" DROP CONSTRAINT IF EXISTS "Category_householdId_fkey";
ALTER TABLE "Category" ADD CONSTRAINT "Category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_householdId_fkey";
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
