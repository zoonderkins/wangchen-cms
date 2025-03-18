-- CreateTable
CREATE TABLE `site_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `site_name_en` VARCHAR(191) NOT NULL,
    `site_name_tw` VARCHAR(191) NOT NULL,
    `site_url` VARCHAR(191) NOT NULL,
    `logo_desktop_path` VARCHAR(191) NULL,
    `logo_tablet_path` VARCHAR(191) NULL,
    `logo_mobile_path` VARCHAR(191) NULL,
    `logo_alt_en` VARCHAR(191) NULL,
    `logo_alt_tw` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
