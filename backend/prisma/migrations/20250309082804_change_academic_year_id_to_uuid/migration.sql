/*
  Warnings:

  - The primary key for the `academic_years` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `submission_status` DROP FOREIGN KEY `submission_status_academic_year_id_fkey`;

-- DropForeignKey
ALTER TABLE `submissions` DROP FOREIGN KEY `submissions_academic_year_id_fkey`;

-- DropIndex
DROP INDEX `submission_status_academic_year_id_fkey` ON `submission_status`;

-- AlterTable
ALTER TABLE `academic_years` DROP PRIMARY KEY,
    MODIFY `academic_year_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`academic_year_id`);

-- AlterTable
ALTER TABLE `submission_status` MODIFY `academic_year_id` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `submissions` MODIFY `academic_year_id` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`academic_year_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_status` ADD CONSTRAINT `submission_status_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`academic_year_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
