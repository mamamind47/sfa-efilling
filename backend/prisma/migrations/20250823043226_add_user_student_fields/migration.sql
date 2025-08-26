-- AlterTable
ALTER TABLE `users` ADD COLUMN `finishedAcadYear` VARCHAR(10) NULL,
    ADD COLUMN `isSenior` BOOLEAN NULL,
    ADD COLUMN `studentStatusName` ENUM('ปกติ', 'ลาออก', 'ตกออก', 'สำเร็จการศึกษา') NULL;
