/*
  Warnings:

  - You are about to alter the column `type` on the `flats` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(9))` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `flats` MODIFY `type` VARCHAR(191) NULL;
