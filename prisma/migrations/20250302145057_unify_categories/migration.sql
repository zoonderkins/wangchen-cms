/*
  Warnings:

  - You are about to drop the `DownloadCategories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FaqCategories` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[slug,type]` on the table `Categories` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Downloads` DROP FOREIGN KEY `Downloads_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `FaqItems` DROP FOREIGN KEY `FaqItems_categoryId_fkey`;

-- DropIndex
DROP INDEX `Downloads_categoryId_fkey` ON `Downloads`;

-- DropIndex
DROP INDEX `FaqItems_categoryId_fkey` ON `FaqItems`;

-- Step 1: Add new columns as nullable first
ALTER TABLE `Categories` 
ADD COLUMN `slug` VARCHAR(191) NULL,
ADD COLUMN `type` ENUM('article', 'page', 'download', 'faq') NULL;

-- Step 2: Migrate existing article categories
UPDATE `Categories` 
SET `type` = 'article',
    `slug` = LOWER(REPLACE(name, ' ', '-'));

-- Step 3: Create new categories from FaqCategories
INSERT INTO `Categories` (`name`, `description`, `order`, `createdAt`, `updatedAt`, `type`, `slug`)
SELECT 
    `name`,
    `description`,
    `order`,
    `createdAt`,
    `updatedAt`,
    'faq' as `type`,
    `slug`
FROM `FaqCategories`;

-- Step 4: Create new categories from DownloadCategories
INSERT INTO `Categories` (`name`, `description`, `order`, `createdAt`, `updatedAt`, `type`, `slug`)
SELECT 
    `name`,
    `description`,
    `order`,
    `createdAt`,
    `updatedAt`,
    'download' as `type`,
    LOWER(REPLACE(name, ' ', '-')) as `slug`
FROM `DownloadCategories`;

-- Step 5: Update FaqItems to reference new categories
UPDATE `FaqItems` fi
JOIN `FaqCategories` fc ON fi.`categoryId` = fc.`id`
JOIN `Categories` c ON c.`name` = fc.`name` AND c.`type` = 'faq'
SET fi.`categoryId` = c.`id`;

-- Step 6: Update Downloads to reference new categories
UPDATE `Downloads` d
JOIN `DownloadCategories` dc ON d.`categoryId` = dc.`id`
JOIN `Categories` c ON c.`name` = dc.`name` AND c.`type` = 'download'
SET d.`categoryId` = c.`id`;

-- Step 7: Make columns non-nullable after data migration
ALTER TABLE `Categories` 
MODIFY COLUMN `slug` VARCHAR(191) NOT NULL,
MODIFY COLUMN `type` ENUM('article', 'page', 'download', 'faq') NOT NULL;

-- Step 8: Add unique constraint
CREATE UNIQUE INDEX `Categories_slug_type_key` ON `Categories`(`slug`, `type`);

-- Step 9: Add foreign key for Pages
ALTER TABLE `Pages` ADD COLUMN `categoryId` INTEGER NULL;
ALTER TABLE `Pages` ADD CONSTRAINT `Pages_categoryId_fkey` 
FOREIGN KEY (`categoryId`) REFERENCES `Categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 10: Update foreign keys for FaqItems and Downloads
ALTER TABLE `FaqItems` ADD CONSTRAINT `FaqItems_categoryId_fkey` 
FOREIGN KEY (`categoryId`) REFERENCES `Categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Downloads` ADD CONSTRAINT `Downloads_categoryId_fkey` 
FOREIGN KEY (`categoryId`) REFERENCES `Categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 11: Drop old category tables
DROP TABLE `FaqCategories`;
DROP TABLE `DownloadCategories`;
