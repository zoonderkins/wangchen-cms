-- DropForeignKey
ALTER TABLE `FrontpageItems` DROP FOREIGN KEY `FrontpageItems_categoryId_fkey`;

-- DropIndex
DROP INDEX `FrontpageItems_categoryId_fkey` ON `FrontpageItems`;

-- AlterTable
ALTER TABLE `FrontpageItems` MODIFY `categoryId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `FrontpageItems` ADD CONSTRAINT `FrontpageItems_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `FrontpageCategories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
