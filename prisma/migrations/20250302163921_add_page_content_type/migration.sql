/*
  Warnings:

  - You are about to drop the column `excerpt` on the `Pages` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `Pages` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(4))`.

*/
-- AlterTable
ALTER TABLE `Pages` DROP COLUMN `excerpt`,
    ADD COLUMN `metaDescription` TEXT NULL,
    ADD COLUMN `metaKeywords` VARCHAR(191) NULL,
    ADD COLUMN `metaTitle` VARCHAR(191) NULL,
    ADD COLUMN `publishedAt` DATETIME(3) NULL,
    MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft';
