-- AlterTable
ALTER TABLE `certificate_types` ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateTable
CREATE TABLE `linked_scholarship` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` VARCHAR(191) NOT NULL,
    `academic_year` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `linked_scholarship_student_id_academic_year_type_key`(`student_id`, `academic_year`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
