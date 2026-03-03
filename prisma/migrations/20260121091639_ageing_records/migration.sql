-- AlterTable
ALTER TABLE `ageing_record` ADD COLUMN `project_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
