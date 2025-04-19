-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateTable
CREATE TABLE `submission_status_logs` (
    `log_id` CHAR(36) NOT NULL,
    `submission_id` CHAR(36) NOT NULL,
    `status` ENUM('draft', 'submitted', 'approved', 'rejected') NOT NULL,
    `reason` VARCHAR(255) NULL,
    `changed_by` CHAR(36) NOT NULL,
    `changed_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `submission_status_logs` ADD CONSTRAINT `submission_status_logs_submission_id_fkey` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`submission_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_status_logs` ADD CONSTRAINT `submission_status_logs_changed_by_fkey` FOREIGN KEY (`changed_by`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
