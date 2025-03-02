/*
  Warnings:

  - You are about to drop the column `category` on the `Downloads` table. All the data in the column will be lost.
  - You are about to drop the column `downloadCount` on the `Downloads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `Downloads` DROP COLUMN `category`,
    DROP COLUMN `downloadCount`,
    ADD COLUMN `categoryId` INTEGER NULL,
    MODIFY `keywords` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `DownloadCategories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Downloads` ADD CONSTRAINT `Downloads_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `DownloadCategories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
