-- CreateTable
CREATE TABLE `PromotionCategories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_en` VARCHAR(191) NOT NULL,
    `name_tw` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description_en` TEXT NULL,
    `description_tw` TEXT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PromotionCategories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromotionItems` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title_en` VARCHAR(191) NOT NULL,
    `title_tw` VARCHAR(191) NOT NULL,
    `content_en` LONGTEXT NOT NULL,
    `content_tw` LONGTEXT NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NULL,
    `imagePath` VARCHAR(191) NULL,
    `publishedDate` DATETIME(3) NOT NULL,
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `categoryId` INTEGER NOT NULL,
    `authorId` INTEGER NOT NULL,

    UNIQUE INDEX `PromotionItems_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PromotionItems` ADD CONSTRAINT `PromotionItems_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `PromotionCategories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromotionItems` ADD CONSTRAINT `PromotionItems_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
