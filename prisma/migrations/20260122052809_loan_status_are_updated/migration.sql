/*
  Warnings:

  - Made the column `loan_Status` on table `ageing_record` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ageing_record` MODIFY `loan_Status` ENUM('NotApplied', 'Applied', 'Approved', 'Rejected') NOT NULL DEFAULT 'NotApplied';
