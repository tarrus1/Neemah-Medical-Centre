/*
  Warnings:

  - The `specialty` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" ALTER COLUMN "credits" SET DEFAULT 0,
DROP COLUMN "specialty",
ADD COLUMN     "specialty" TEXT[] DEFAULT ARRAY[]::TEXT[];
