/*
  Warnings:

  - You are about to drop the column `network` on the `DatabaseInstance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[containerId]` on the table `DatabaseInstance` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "DatabaseInstance" DROP COLUMN "network",
ADD COLUMN     "containerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseInstance_containerId_key" ON "DatabaseInstance"("containerId");
