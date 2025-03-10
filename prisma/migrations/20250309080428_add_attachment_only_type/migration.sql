-- DropForeignKey
ALTER TABLE `Platforms` DROP FOREIGN KEY `Platforms_categoryId_fkey`;

-- DropIndex
DROP INDEX `Platforms_categoryId_fkey` ON `Platforms`;

-- AlterTable
ALTER TABLE `Platforms` MODIFY `categoryId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Platforms` ADD CONSTRAINT `Platforms_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `PlatformCategories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
