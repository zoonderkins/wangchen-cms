-- CreateTable
CREATE TABLE `PlatformAttachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `filename` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `title_en` VARCHAR(191) NULL,
    `title_tw` VARCHAR(191) NULL,
    `description_en` TEXT NULL,
    `description_tw` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `platformId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PlatformAttachments` ADD CONSTRAINT `PlatformAttachments_platformId_fkey` FOREIGN KEY (`platformId`) REFERENCES `Platforms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
