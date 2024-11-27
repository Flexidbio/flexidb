/*
  Warnings:

  - Added the required column `emailConfig` to the `settings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('SMTP', 'RESEND');

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "resendConfig" JSONB,
ADD COLUMN     "smtpConfig" JSONB,
DROP COLUMN "emailConfig",
ADD COLUMN     "emailConfig" "EmailProvider" NOT NULL;
