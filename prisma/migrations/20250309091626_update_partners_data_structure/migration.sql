-- DropForeignKey
ALTER TABLE `Platforms` DROP FOREIGN KEY `Platforms_authorId_fkey`;

-- DropIndex
DROP INDEX `Platforms_authorId_fkey` ON `Platforms`;

-- DropIndex
DROP INDEX `Platforms_slug_key` ON `Platforms`;

-- AlterTable
ALTER TABLE `Platforms` MODIFY `title_en` VARCHAR(255) NOT NULL,
    MODIFY `title_tw` VARCHAR(255) NOT NULL,
    MODIFY `content_en` TEXT NULL,
    MODIFY `content_tw` TEXT NULL,
    MODIFY `slug` VARCHAR(255) NOT NULL,
    MODIFY `url` VARCHAR(255) NULL,
    MODIFY `imagePath` VARCHAR(255) NULL,
    MODIFY `publishedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `authorId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `Platforms` ADD CONSTRAINT `Platforms_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
