-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateTable
CREATE TABLE `linked_volunteer` (
    `id` CHAR(36) NOT NULL,
    `user_id` VARCHAR(50) NOT NULL,
    `year` VARCHAR(10) NOT NULL,
    `hours` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_id_year_unique`(`user_id`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
