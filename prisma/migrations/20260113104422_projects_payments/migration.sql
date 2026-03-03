-- AlterTable
ALTER TABLE `payments` ADD COLUMN `project_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
