/*
  Warnings:

  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[email]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `users` DROP COLUMN `password`,
    ADD COLUMN `accessToken` VARCHAR(255) NULL,
    ADD COLUMN `email` VARCHAR(100) NOT NULL,
    ADD COLUMN `name` VARCHAR(100) NOT NULL,
    ADD COLUMN `phone` VARCHAR(15) NULL,
    ADD COLUMN `refreshToken` VARCHAR(255) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_email_key` ON `users`(`email`);
