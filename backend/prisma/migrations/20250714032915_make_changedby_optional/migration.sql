-- DropForeignKey
ALTER TABLE `submission_status_logs` DROP FOREIGN KEY `submission_status_logs_changed_by_fkey`;

-- DropIndex
DROP INDEX `submission_status_logs_changed_by_fkey` ON `submission_status_logs`;

-- AlterTable
ALTER TABLE `submission_status_logs` MODIFY `changed_by` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `submission_status_logs` ADD CONSTRAINT `submission_status_logs_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;
