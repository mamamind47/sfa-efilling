/*
  Warnings:

  - You are about to drop the `submission_requests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `submission_requests` DROP FOREIGN KEY `submission_requests_academic_year_id_fkey`;

-- DropForeignKey
ALTER TABLE `submission_requests` DROP FOREIGN KEY `submission_requests_user_id_fkey`;

-- DropTable
DROP TABLE `submission_requests`;

-- CreateTable
CREATE TABLE `submission_status` (
    `status_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `academic_year_id` INTEGER NOT NULL,
    `is_marked` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `submission_status_user_id_key`(`user_id`),
    PRIMARY KEY (`status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `submission_status` ADD CONSTRAINT `submission_status_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `submission_status` ADD CONSTRAINT `submission_status_academic_year_id_fkey` FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`academic_year_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
