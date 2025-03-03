-- Add contentType field
ALTER TABLE `Pages` ADD COLUMN `contentType` VARCHAR(191) NOT NULL DEFAULT 'quill';
