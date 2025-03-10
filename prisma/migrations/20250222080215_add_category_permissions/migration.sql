-- CreateTable
CREATE TABLE `CategoryPermissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `canView` BOOLEAN NOT NULL DEFAULT true,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canEdit` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,

    UNIQUE INDEX `CategoryPermissions_userId_categoryId_key`(`userId`, `categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CategoryPermissions` ADD CONSTRAINT `CategoryPermissions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `Users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CategoryPermissions` ADD CONSTRAINT `CategoryPermissions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
