/*
  Warnings:

  - The values [draft] on the enum `submission_status_logs_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `status` on the `submissions` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(2))` to `Enum(EnumId(3))`.

*/
-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `submission_status_logs` MODIFY `status` ENUM('submitted', 'approved', 'rejected') NOT NULL;

-- AlterTable
ALTER TABLE `submissions` MODIFY `status` ENUM('submitted', 'approved', 'rejected') NOT NULL DEFAULT 'submitted';
