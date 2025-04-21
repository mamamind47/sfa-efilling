-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `submissions` ADD COLUMN `hours_requested` INTEGER NULL;
