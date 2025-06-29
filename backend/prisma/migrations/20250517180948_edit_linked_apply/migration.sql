/*
  Warnings:

  - A unique constraint covering the columns `[student_id,academic_year]` on the table `linked_scholarship` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `linked_scholarship_student_id_academic_year_type_key` ON `linked_scholarship`;

-- CreateIndex
CREATE UNIQUE INDEX `linked_scholarship_student_id_academic_year_key` ON `linked_scholarship`(`student_id`, `academic_year`);
