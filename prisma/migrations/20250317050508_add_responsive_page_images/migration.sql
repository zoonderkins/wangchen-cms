-- AlterTable
ALTER TABLE `PageImages` ADD COLUMN `filenameDesktop` VARCHAR(191) NULL,
    ADD COLUMN `filenameMobile` VARCHAR(191) NULL,
    ADD COLUMN `filenameTablet` VARCHAR(191) NULL,
    ADD COLUMN `originalNameDesktop` VARCHAR(191) NULL,
    ADD COLUMN `originalNameMobile` VARCHAR(191) NULL,
    ADD COLUMN `originalNameTablet` VARCHAR(191) NULL,
    ADD COLUMN `pathDesktop` VARCHAR(191) NULL,
    ADD COLUMN `pathMobile` VARCHAR(191) NULL,
    ADD COLUMN `pathTablet` VARCHAR(191) NULL;
