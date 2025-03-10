-- CreateTable
CREATE TABLE `Downloads` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `filename` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `path` VARCHAR(191) NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `keywords` TEXT NULL,
    `downloadCount` INTEGER NOT NULL DEFAULT 0,
    `category` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `authorId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Downloads` ADD CONSTRAINT `Downloads_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
