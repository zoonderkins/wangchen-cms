/*
  Warnings:

  - You are about to drop the column `content_en` on the `NewsItems` table. All the data in the column will be lost.
  - You are about to drop the column `content_tw` on the `NewsItems` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `NewsItems` DROP COLUMN `content_en`,
    DROP COLUMN `content_tw`;
