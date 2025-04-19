-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `submissions` ADD COLUMN `certificate_type_id` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_certificate_type_id_fkey` FOREIGN KEY (`certificate_type_id`) REFERENCES `certificate_types`(`certificate_type_id`) ON DELETE SET NULL ON UPDATE CASCADE;
