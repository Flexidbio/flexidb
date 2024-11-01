/*
  Warnings:

  - You are about to drop the column `containerId` on the `DatabaseInstance` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[container_id]` on the table `DatabaseInstance` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DatabaseInstance_containerId_key";

-- AlterTable
ALTER TABLE "DatabaseInstance" DROP COLUMN "containerId",
ADD COLUMN     "container_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseInstance_container_id_key" ON "DatabaseInstance"("container_id");
