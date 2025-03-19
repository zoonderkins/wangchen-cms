/*
  Warnings:

  - You are about to drop the column `lastReset` on the `VisitCounter` table. All the data in the column will be lost.
  - You are about to drop the column `todayCount` on the `VisitCounter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `AboutItems` ADD COLUMN `imagePathDesktop` VARCHAR(191) NULL,
    ADD COLUMN `imagePathMobile` VARCHAR(191) NULL,
    ADD COLUMN `imagePathTablet` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `VisitCounter` DROP COLUMN `lastReset`,
    DROP COLUMN `todayCount`;

-- AlterTable
ALTER TABLE `VisitCounterHistory` ADD COLUMN `lastReset` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `todayCount` INTEGER NOT NULL DEFAULT 0;
