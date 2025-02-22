/*
  Warnings:

  - You are about to drop the column `slug` on the `Categories` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `articles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Categories_slug_key` ON `Categories`;

-- DropIndex
DROP INDEX `articles_slug_key` ON `articles`;

-- AlterTable
ALTER TABLE `Categories` DROP COLUMN `slug`;

-- AlterTable
ALTER TABLE `articles` DROP COLUMN `slug`;
