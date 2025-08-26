/*
  Warnings:

  - A unique constraint covering the columns `[user_id,year,project_name]` on the table `linked_volunteer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `user_id_year_unique` ON `linked_volunteer`;

-- AlterTable
ALTER TABLE `linked_volunteer` ADD COLUMN `activity_type` VARCHAR(100) NULL,
    ADD COLUMN `project_name` VARCHAR(200) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `user_year_project_unique` ON `linked_volunteer`(`user_id`, `year`, `project_name`);
