/*
  Warnings:

  - You are about to drop the column `lead_temperature` on the `leads` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `leads` DROP COLUMN `lead_temperature`,
    ADD COLUMN `lead_status` ENUM('Hot', 'Cold') NULL;
