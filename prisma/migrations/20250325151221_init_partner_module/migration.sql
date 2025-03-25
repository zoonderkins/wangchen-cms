-- CreateTable
CREATE TABLE `PartnersCategories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name_en` VARCHAR(191) NOT NULL,
    `name_tw` VARCHAR(191) NOT NULL,
    `description_en` VARCHAR(191) NULL,
    `description_tw` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PartnersCategories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Partners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title_en` VARCHAR(255) NOT NULL,
    `title_tw` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `publishedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,
    `categoryId` INTEGER NULL,
    `authorId` INTEGER NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `url` VARCHAR(255) NULL,
    `suppliers_en` TEXT NULL,
    `suppliers_tw` TEXT NULL,
    `buyers_en` TEXT NULL,
    `buyers_tw` TEXT NULL,

    INDEX `Partners_authorId_fkey`(`authorId`),
    INDEX `Partners_categoryId_fkey`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Partners` ADD CONSTRAINT `Partners_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `Users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Partners` ADD CONSTRAINT `Partners_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `PartnersCategories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
