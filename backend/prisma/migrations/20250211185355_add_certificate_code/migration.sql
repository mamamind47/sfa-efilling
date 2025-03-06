/*
  Warnings:

  - A unique constraint covering the columns `[certificate_code]` on the table `certificate_types` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `certificate_types_certificate_code_key` ON `certificate_types`(`certificate_code`);
