/*
  Warnings:

  - You are about to drop the column `editorMode` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `metaDescription` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `metaKeywords` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `Pages` table. All the data in the column will be lost.
  - You are about to drop the column `publishedAt` on the `Pages` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `Pages` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(1))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `Pages` DROP COLUMN `editorMode`,
    DROP COLUMN `metaDescription`,
    DROP COLUMN `metaKeywords`,
    DROP COLUMN `metaTitle`,
    DROP COLUMN `publishedAt`,
    ADD COLUMN `excerpt` TEXT NULL,
    MODIFY `content` TEXT NOT NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'draft';
