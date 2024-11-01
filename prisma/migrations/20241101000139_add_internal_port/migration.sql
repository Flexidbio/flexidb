/*
  Warnings:

  - Added the required column `internalPort` to the `DatabaseInstance` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DatabaseInstance" ADD COLUMN     "internalPort" INTEGER NOT NULL;
