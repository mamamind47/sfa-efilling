-- AlterTable
ALTER TABLE `certificate_types` ADD COLUMN `category` VARCHAR(191) NULL,
    ALTER COLUMN `updated_at` DROP DEFAULT;
