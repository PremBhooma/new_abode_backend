-- AlterTable
ALTER TABLE `ageing_record` ADD COLUMN `ageing_days` INTEGER NULL,
    ADD COLUMN `loan_time_days` BOOLEAN NULL DEFAULT false;
