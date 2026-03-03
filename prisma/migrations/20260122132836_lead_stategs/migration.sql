-- AlterTable
ALTER TABLE `leads` ADD COLUMN `bedroom` VARCHAR(50) NULL,
    ADD COLUMN `funding` ENUM('Selfloan', 'Bankloan') NULL,
    ADD COLUMN `lead_age` INTEGER NULL,
    ADD COLUMN `lead_temperature` ENUM('Hot', 'Cold') NULL,
    ADD COLUMN `max_budget` DOUBLE NULL,
    ADD COLUMN `min_budget` DOUBLE NULL,
    ADD COLUMN `purpose` ENUM('Enduse', 'Investment') NULL;
