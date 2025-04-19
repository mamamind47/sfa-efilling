/*
  Warnings:

  - The primary key for the `certificate_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `submission_details` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `submission_status` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `submissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `submission_details` DROP FOREIGN KEY `fk_submission_details_certificate_type_id`;

-- DropForeignKey
ALTER TABLE `submission_details` DROP FOREIGN KEY `fk_submission_details_submission_id`;

-- DropForeignKey
ALTER TABLE `submission_status` DROP FOREIGN KEY `submission_status_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `submissions` DROP FOREIGN KEY `fk_submissions_academic_year_id`;

-- DropForeignKey
ALTER TABLE `submissions` DROP FOREIGN KEY `fk_submissions_user_id`;

-- AlterTable
ALTER TABLE `certificate_types` DROP PRIMARY KEY,
    MODIFY `certificate_type_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`certificate_type_id`);

-- AlterTable
ALTER TABLE `submission_details` DROP PRIMARY KEY,
    MODIFY `submission_detail_id` CHAR(36) NOT NULL,
    MODIFY `submission_id` CHAR(36) NOT NULL,
    MODIFY `certificate_type_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`submission_detail_id`);

-- AlterTable
ALTER TABLE `submission_status` DROP PRIMARY KEY,
    MODIFY `status_id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`status_id`);

-- AlterTable
ALTER TABLE `submissions` DROP PRIMARY KEY,
    MODIFY `submission_id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`submission_id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`user_id`);

-- AddForeignKey
ALTER TABLE `submission_status` ADD CONSTRAINT `submission_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_details` ADD CONSTRAINT `submission_details_certificate_type_id_fkey` FOREIGN KEY (`certificate_type_id`) REFERENCES `certificate_types`(`certificate_type_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_details` ADD CONSTRAINT `submission_details_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`submission_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`academic_year_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `submission_details_certificate_type_id_idx` ON `submission_details`(`certificate_type_id`);
DROP INDEX `fk_submission_details_certificate_type_id` ON `submission_details`;

-- RedefineIndex
CREATE INDEX `submission_details_submission_id_idx` ON `submission_details`(`submission_id`);
DROP INDEX `fk_submission_details_submission_id` ON `submission_details`;

-- RedefineIndex
CREATE INDEX `submissions_academic_year_id_idx` ON `submissions`(`academic_year_id`);
DROP INDEX `fk_submissions_academic_year_id` ON `submissions`;

-- RedefineIndex
CREATE INDEX `submissions_user_id_idx` ON `submissions`(`user_id`);
DROP INDEX `fk_submissions_user_id` ON `submissions`;
