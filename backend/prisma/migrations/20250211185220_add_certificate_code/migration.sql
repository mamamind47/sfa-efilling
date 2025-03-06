/*
  Warnings:

  - Added the required column `certificate_code` to the `certificate_types` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `certificate_types` ADD COLUMN `certificate_code` VARCHAR(50) NOT NULL;
