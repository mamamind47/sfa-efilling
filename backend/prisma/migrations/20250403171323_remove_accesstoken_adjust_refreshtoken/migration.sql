/*
  Warnings:

  - You are about to drop the column `accessToken` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `users` DROP COLUMN `accessToken`,
    MODIFY `refreshToken` TEXT NULL;
