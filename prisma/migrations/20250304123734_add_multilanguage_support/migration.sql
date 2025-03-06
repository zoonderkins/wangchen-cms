/*
  Warnings:

  - You are about to drop the column `description` on the `Banners` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Banners` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Categories` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Categories` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `DownloadCategories` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `DownloadCategories` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Downloads` table. All the data in the column will be lost.
  - You are about to drop the column `keywords` on the `Downloads` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Downloads` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `FaqCategories` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `FaqCategories` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `FaqItems` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `FaqItems` table. All the data in the column will be lost.
  - You are about to drop the column `alt` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `caption` on the `Media` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `metaDescription` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `metaKeywords` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `content` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `excerpt` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `metaDescription` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `metaKeywords` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `articles` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `articles` table. All the data in the column will be lost.
*/

-- First, add the new columns without dropping the old ones
-- Banners
ALTER TABLE `Banners` 
    ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `description_tw` TEXT NULL,
    ADD COLUMN `title_en` VARCHAR(191) NULL,
    ADD COLUMN `title_tw` VARCHAR(191) NULL;

-- Categories
ALTER TABLE `Categories` 
    ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `description_tw` TEXT NULL,
    ADD COLUMN `name_en` VARCHAR(191) NULL,
    ADD COLUMN `name_tw` VARCHAR(191) NULL;

-- DownloadCategories
ALTER TABLE `DownloadCategories` 
    ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `description_tw` TEXT NULL,
    ADD COLUMN `name_en` VARCHAR(191) NULL,
    ADD COLUMN `name_tw` VARCHAR(191) NULL;

-- Downloads
ALTER TABLE `Downloads` 
    ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `description_tw` TEXT NULL,
    ADD COLUMN `keywords_en` VARCHAR(191) NULL,
    ADD COLUMN `keywords_tw` VARCHAR(191) NULL,
    ADD COLUMN `title_en` VARCHAR(191) NULL,
    ADD COLUMN `title_tw` VARCHAR(191) NULL;

-- FaqCategories
ALTER TABLE `FaqCategories` 
    ADD COLUMN `description_en` TEXT NULL,
    ADD COLUMN `description_tw` TEXT NULL,
    ADD COLUMN `name_en` VARCHAR(191) NULL,
    ADD COLUMN `name_tw` VARCHAR(191) NULL;

-- FaqItems
ALTER TABLE `FaqItems` 
    ADD COLUMN `content_en` LONGTEXT NULL,
    ADD COLUMN `content_tw` LONGTEXT NULL,
    ADD COLUMN `title_en` VARCHAR(191) NULL,
    ADD COLUMN `title_tw` VARCHAR(191) NULL;

-- Media
ALTER TABLE `Media` 
    ADD COLUMN `alt_en` VARCHAR(191) NULL,
    ADD COLUMN `alt_tw` VARCHAR(191) NULL,
    ADD COLUMN `caption_en` TEXT NULL,
    ADD COLUMN `caption_tw` TEXT NULL;

-- Pages
ALTER TABLE `Pages` 
    ADD COLUMN `content_en` LONGTEXT NULL,
    ADD COLUMN `content_tw` LONGTEXT NULL,
    ADD COLUMN `metaDescription_en` TEXT NULL,
    ADD COLUMN `metaDescription_tw` TEXT NULL,
    ADD COLUMN `metaKeywords_en` VARCHAR(191) NULL,
    ADD COLUMN `metaKeywords_tw` VARCHAR(191) NULL,
    ADD COLUMN `metaTitle_en` VARCHAR(191) NULL,
    ADD COLUMN `metaTitle_tw` VARCHAR(191) NULL,
    ADD COLUMN `title_en` VARCHAR(191) NULL,
    ADD COLUMN `title_tw` VARCHAR(191) NULL;

-- Articles
ALTER TABLE `articles` 
    ADD COLUMN `content_en` LONGTEXT NULL,
    ADD COLUMN `content_tw` LONGTEXT NULL,
    ADD COLUMN `excerpt_en` TEXT NULL,
    ADD COLUMN `excerpt_tw` TEXT NULL,
    ADD COLUMN `metaDescription_en` TEXT NULL,
    ADD COLUMN `metaDescription_tw` TEXT NULL,
    ADD COLUMN `metaKeywords_en` VARCHAR(191) NULL,
    ADD COLUMN `metaKeywords_tw` VARCHAR(191) NULL,
    ADD COLUMN `metaTitle_en` VARCHAR(191) NULL,
    ADD COLUMN `metaTitle_tw` VARCHAR(191) NULL,
    ADD COLUMN `title_en` VARCHAR(191) NULL,
    ADD COLUMN `title_tw` VARCHAR(191) NULL;

-- Now copy the existing data to both language fields
-- Banners
UPDATE `Banners` SET 
    `title_en` = `title`,
    `title_tw` = `title`,
    `description_en` = `description`,
    `description_tw` = `description`;

-- Categories
UPDATE `Categories` SET 
    `name_en` = `name`,
    `name_tw` = `name`,
    `description_en` = `description`,
    `description_tw` = `description`;

-- DownloadCategories
UPDATE `DownloadCategories` SET 
    `name_en` = `name`,
    `name_tw` = `name`,
    `description_en` = `description`,
    `description_tw` = `description`;

-- Downloads
UPDATE `Downloads` SET 
    `title_en` = `title`,
    `title_tw` = `title`,
    `description_en` = `description`,
    `description_tw` = `description`,
    `keywords_en` = `keywords`,
    `keywords_tw` = `keywords`;

-- FaqCategories
UPDATE `FaqCategories` SET 
    `name_en` = `name`,
    `name_tw` = `name`,
    `description_en` = `description`,
    `description_tw` = `description`;

-- FaqItems
UPDATE `FaqItems` SET 
    `title_en` = `title`,
    `title_tw` = `title`,
    `content_en` = `content`,
    `content_tw` = `content`;

-- Media
UPDATE `Media` SET 
    `alt_en` = `alt`,
    `alt_tw` = `alt`,
    `caption_en` = `caption`,
    `caption_tw` = `caption`;

-- Pages
UPDATE `Pages` SET 
    `title_en` = `title`,
    `title_tw` = `title`,
    `content_en` = `content`,
    `content_tw` = `content`,
    `metaTitle_en` = `metaTitle`,
    `metaTitle_tw` = `metaTitle`,
    `metaDescription_en` = `metaDescription`,
    `metaDescription_tw` = `metaDescription`,
    `metaKeywords_en` = `metaKeywords`,
    `metaKeywords_tw` = `metaKeywords`;

-- Articles
UPDATE `articles` SET 
    `title_en` = `title`,
    `title_tw` = `title`,
    `content_en` = `content`,
    `content_tw` = `content`,
    `excerpt_en` = `excerpt`,
    `excerpt_tw` = `excerpt`,
    `metaTitle_en` = `metaTitle`,
    `metaTitle_tw` = `metaTitle`,
    `metaDescription_en` = `metaDescription`,
    `metaDescription_tw` = `metaDescription`,
    `metaKeywords_en` = `metaKeywords`,
    `metaKeywords_tw` = `metaKeywords`;

-- Now make the new columns NOT NULL where needed
ALTER TABLE `Banners` 
    MODIFY `title_en` VARCHAR(191) NOT NULL,
    MODIFY `title_tw` VARCHAR(191) NOT NULL;

ALTER TABLE `Categories` 
    MODIFY `name_en` VARCHAR(191) NOT NULL,
    MODIFY `name_tw` VARCHAR(191) NOT NULL;

ALTER TABLE `DownloadCategories` 
    MODIFY `name_en` VARCHAR(191) NOT NULL,
    MODIFY `name_tw` VARCHAR(191) NOT NULL;

ALTER TABLE `Downloads` 
    MODIFY `title_en` VARCHAR(191) NOT NULL,
    MODIFY `title_tw` VARCHAR(191) NOT NULL;

ALTER TABLE `FaqCategories` 
    MODIFY `name_en` VARCHAR(191) NOT NULL,
    MODIFY `name_tw` VARCHAR(191) NOT NULL;

ALTER TABLE `FaqItems` 
    MODIFY `title_en` VARCHAR(191) NOT NULL,
    MODIFY `title_tw` VARCHAR(191) NOT NULL,
    MODIFY `content_en` LONGTEXT NOT NULL,
    MODIFY `content_tw` LONGTEXT NOT NULL;

ALTER TABLE `Pages` 
    MODIFY `title_en` VARCHAR(191) NOT NULL,
    MODIFY `title_tw` VARCHAR(191) NOT NULL,
    MODIFY `content_en` LONGTEXT NOT NULL,
    MODIFY `content_tw` LONGTEXT NOT NULL;

ALTER TABLE `articles` 
    MODIFY `title_en` VARCHAR(191) NOT NULL,
    MODIFY `title_tw` VARCHAR(191) NOT NULL,
    MODIFY `content_en` LONGTEXT NOT NULL,
    MODIFY `content_tw` LONGTEXT NOT NULL;

-- Finally, drop the old columns
-- Banners
ALTER TABLE `Banners` 
    DROP COLUMN `description`,
    DROP COLUMN `title`;

-- Categories
ALTER TABLE `Categories` 
    DROP COLUMN `description`,
    DROP COLUMN `name`;

-- DownloadCategories
ALTER TABLE `DownloadCategories` 
    DROP COLUMN `description`,
    DROP COLUMN `name`;

-- Downloads
ALTER TABLE `Downloads` 
    DROP COLUMN `description`,
    DROP COLUMN `keywords`,
    DROP COLUMN `title`;

-- FaqCategories
ALTER TABLE `FaqCategories` 
    DROP COLUMN `description`,
    DROP COLUMN `name`;

-- FaqItems
ALTER TABLE `FaqItems` 
    DROP COLUMN `content`,
    DROP COLUMN `title`;

-- Media
ALTER TABLE `Media` 
    DROP COLUMN `alt`,
    DROP COLUMN `caption`;

-- Pages
ALTER TABLE `Pages` 
    DROP COLUMN `content`,
    DROP COLUMN `metaDescription`,
    DROP COLUMN `metaKeywords`,
    DROP COLUMN `metaTitle`,
    DROP COLUMN `title`;

-- Articles
ALTER TABLE `articles` 
    DROP COLUMN `content`,
    DROP COLUMN `excerpt`,
    DROP COLUMN `metaDescription`,
    DROP COLUMN `metaKeywords`,
    DROP COLUMN `metaTitle`,
    DROP COLUMN `title`;
