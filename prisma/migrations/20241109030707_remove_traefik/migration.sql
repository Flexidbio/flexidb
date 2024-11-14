/*
  Warnings:

  - You are about to drop the `traefik_routes` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "domain" TEXT;

-- DropTable
DROP TABLE "traefik_routes";
