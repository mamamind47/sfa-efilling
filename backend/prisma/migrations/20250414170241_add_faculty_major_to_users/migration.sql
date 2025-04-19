-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `faculty` VARCHAR(100) NULL,
    ADD COLUMN `major` VARCHAR(100) NULL;
