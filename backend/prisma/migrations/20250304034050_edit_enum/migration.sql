/*
  Warnings:

  - The values [open,closed] on the enum `academic_years_status` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `academic_years` MODIFY `status` ENUM('OPEN', 'CLOSED') NULL;
