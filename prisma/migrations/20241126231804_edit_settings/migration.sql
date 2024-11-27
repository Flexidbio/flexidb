/*
  Warnings:

  - You are about to drop the column `emailConfig` on the `settings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "settings" DROP COLUMN "emailConfig",
ADD COLUMN     "emailFrom" TEXT,
ADD COLUMN     "emailProvider" "EmailProvider";
