/*
  Warnings:

  - You are about to drop the `submission_details` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `submission_status` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `file_path` to the `submissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `submissions` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `submission_details` DROP FOREIGN KEY `submission_details_certificate_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `submission_details` DROP FOREIGN KEY `submission_details_submission_id_fkey`;

-- DropForeignKey
ALTER TABLE `submission_status` DROP FOREIGN KEY `submission_status_academic_year_id_fkey`;

-- DropForeignKey
ALTER TABLE `submission_status` DROP FOREIGN KEY `submission_status_user_id_fkey`;

-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `submissions` ADD COLUMN `file_path` VARCHAR(255) NOT NULL,
    ADD COLUMN `hours` INTEGER NULL,
    ADD COLUMN `type` VARCHAR(50) NOT NULL;

-- DropTable
DROP TABLE `submission_details`;

-- DropTable
DROP TABLE `submission_status`;

-- CreateIndex
CREATE INDEX `submissions_type_idx` ON `submissions`(`type`);
