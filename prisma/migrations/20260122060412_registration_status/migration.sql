-- AlterTable
ALTER TABLE `ageing_record` ADD COLUMN `registration_status` ENUM('Registered', 'NotRegistered') NOT NULL DEFAULT 'NotRegistered';
