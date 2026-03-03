-- AlterTable
ALTER TABLE `amenities` ADD COLUMN `project_id` BIGINT NULL;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
