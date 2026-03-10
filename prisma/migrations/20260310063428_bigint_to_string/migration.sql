/*
  Warnings:

  - The primary key for the `ageing_record` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `agreement_template` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `amenities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `backup_data` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `backup_data` table. All the data in the column will be lost.
  - The primary key for the `backup_schedule` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `banks_list` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `blocks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `blocks` table. All the data in the column will be lost.
  - The primary key for the `booking_stages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `column_store` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `column_store` table. All the data in the column will be lost.
  - The primary key for the `company_info` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `countries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `coupon_gifts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `customer_address` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `customer_flat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `customer_flat_update_activities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `customeractivities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `customerfilemanager` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `customerfilemanager` table. All the data in the column will be lost.
  - The primary key for the `customernotes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `customers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `customers` table. All the data in the column will be lost.
  - The primary key for the `employee_project_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `employees` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `employees` table. All the data in the column will be lost.
  - The primary key for the `flatfilemanager` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `flatfilemanager` table. All the data in the column will be lost.
  - The primary key for the `flatnotes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `flats` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `flats` table. All the data in the column will be lost.
  - The primary key for the `group_owner` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `group_owner` table. All the data in the column will be lost.
  - The primary key for the `lead_stages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `lead_transfer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `leads` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `leads` table. All the data in the column will be lost.
  - The primary key for the `leads_activities` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `leads_address` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `leads_file_manager` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `leads_file_manager` table. All the data in the column will be lost.
  - The primary key for the `leads_notes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `leads_profession` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `parsedpayments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `parsedpayments` table. All the data in the column will be lost.
  - The primary key for the `payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `payments` table. All the data in the column will be lost.
  - The primary key for the `profession` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `project` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `uuid` on the `project` table. All the data in the column will be lost.
  - The primary key for the `refund_ageing_record` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `rewards` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `role_permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sale_deed_tempalte` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `taskactivities` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `ageing_record` DROP FOREIGN KEY `ageing_record_customer_flat_fkey`;

-- DropForeignKey
ALTER TABLE `ageing_record` DROP FOREIGN KEY `ageing_record_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `ageing_record` DROP FOREIGN KEY `ageing_record_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `ageing_record` DROP FOREIGN KEY `ageing_record_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `amenities` DROP FOREIGN KEY `amenities_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `blocks` DROP FOREIGN KEY `blocks_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `booking_stages` DROP FOREIGN KEY `booking_stages_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `booking_stages` DROP FOREIGN KEY `booking_stages_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `coupon_gifts` DROP FOREIGN KEY `coupon_gifts_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `customer_address` DROP FOREIGN KEY `customer_address_country_fkey`;

-- DropForeignKey
ALTER TABLE `customer_address` DROP FOREIGN KEY `customer_address_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `customer_flat` DROP FOREIGN KEY `customer_flat_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `customer_flat` DROP FOREIGN KEY `customer_flat_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `customer_flat_update_activities` DROP FOREIGN KEY `customer_flat_update_activities_customerflat_id_fkey`;

-- DropForeignKey
ALTER TABLE `customer_flat_update_activities` DROP FOREIGN KEY `customer_flat_update_activities_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `customeractivities` DROP FOREIGN KEY `customeractivities_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `customeractivities` DROP FOREIGN KEY `customeractivities_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `customerfilemanager` DROP FOREIGN KEY `customerfilemanager_added_by_fkey`;

-- DropForeignKey
ALTER TABLE `customerfilemanager` DROP FOREIGN KEY `customerfilemanager_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `customernotes` DROP FOREIGN KEY `customernotes_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `customernotes` DROP FOREIGN KEY `customernotes_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `customers` DROP FOREIGN KEY `customers_added_by_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `customers` DROP FOREIGN KEY `customers_country_of_citizenship_fkey`;

-- DropForeignKey
ALTER TABLE `customers` DROP FOREIGN KEY `customers_country_of_residence_fkey`;

-- DropForeignKey
ALTER TABLE `customers` DROP FOREIGN KEY `customers_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `employee_project_permissions` DROP FOREIGN KEY `employee_project_permissions_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `employee_project_permissions` DROP FOREIGN KEY `employee_project_permissions_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `employees` DROP FOREIGN KEY `employees_reporting_head_id_fkey`;

-- DropForeignKey
ALTER TABLE `employees` DROP FOREIGN KEY `employees_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `flatfilemanager` DROP FOREIGN KEY `flatfilemanager_added_by_fkey`;

-- DropForeignKey
ALTER TABLE `flatfilemanager` DROP FOREIGN KEY `flatfilemanager_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `flatnotes` DROP FOREIGN KEY `flatnotes_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `flatnotes` DROP FOREIGN KEY `flatnotes_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `flats` DROP FOREIGN KEY `flats_added_by_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `flats` DROP FOREIGN KEY `flats_block_id_fkey`;

-- DropForeignKey
ALTER TABLE `flats` DROP FOREIGN KEY `flats_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `flats` DROP FOREIGN KEY `flats_group_owner_id_fkey`;

-- DropForeignKey
ALTER TABLE `flats` DROP FOREIGN KEY `flats_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_transfer` DROP FOREIGN KEY `lead_transfer_from_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_transfer` DROP FOREIGN KEY `lead_transfer_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_transfer` DROP FOREIGN KEY `lead_transfer_to_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `lead_transfer` DROP FOREIGN KEY `lead_transfer_transfered_by_fkey`;

-- DropForeignKey
ALTER TABLE `leads` DROP FOREIGN KEY `leads_added_by_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads` DROP FOREIGN KEY `leads_assigned_to_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads` DROP FOREIGN KEY `leads_country_of_citizenship_fkey`;

-- DropForeignKey
ALTER TABLE `leads` DROP FOREIGN KEY `leads_country_of_residence_fkey`;

-- DropForeignKey
ALTER TABLE `leads` DROP FOREIGN KEY `leads_lead_stage_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads` DROP FOREIGN KEY `leads_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads_activities` DROP FOREIGN KEY `leads_activities_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads_activities` DROP FOREIGN KEY `leads_activities_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads_address` DROP FOREIGN KEY `leads_address_country_fkey`;

-- DropForeignKey
ALTER TABLE `leads_address` DROP FOREIGN KEY `leads_address_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads_file_manager` DROP FOREIGN KEY `leads_file_manager_added_by_fkey`;

-- DropForeignKey
ALTER TABLE `leads_file_manager` DROP FOREIGN KEY `leads_file_manager_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads_notes` DROP FOREIGN KEY `leads_notes_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads_notes` DROP FOREIGN KEY `leads_notes_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `leads_profession` DROP FOREIGN KEY `leads_profession_lead_id_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_added_by_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `profession` DROP FOREIGN KEY `profession_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `project` DROP FOREIGN KEY `project_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `refund_ageing_record` DROP FOREIGN KEY `refund_ageing_record_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `refund_ageing_record` DROP FOREIGN KEY `refund_ageing_record_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `refund_ageing_record` DROP FOREIGN KEY `refund_ageing_record_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `rewards` DROP FOREIGN KEY `rewards_customer_id_fkey`;

-- DropForeignKey
ALTER TABLE `rewards` DROP FOREIGN KEY `rewards_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `rewards` DROP FOREIGN KEY `rewards_flat_id_fkey`;

-- DropForeignKey
ALTER TABLE `rewards` DROP FOREIGN KEY `rewards_project_id_fkey`;

-- DropForeignKey
ALTER TABLE `taskactivities` DROP FOREIGN KEY `taskactivities_employee_id_fkey`;

-- DropForeignKey
ALTER TABLE `taskactivities` DROP FOREIGN KEY `taskactivities_flat_id_fkey`;

-- DropIndex
DROP INDEX `ageing_record_customer_flat_fkey` ON `ageing_record`;

-- DropIndex
DROP INDEX `ageing_record_customer_id_fkey` ON `ageing_record`;

-- DropIndex
DROP INDEX `ageing_record_flat_id_fkey` ON `ageing_record`;

-- DropIndex
DROP INDEX `ageing_record_project_id_fkey` ON `ageing_record`;

-- DropIndex
DROP INDEX `amenities_project_id_fkey` ON `amenities`;

-- DropIndex
DROP INDEX `backup_data_uuid_key` ON `backup_data`;

-- DropIndex
DROP INDEX `blocks_project_id_fkey` ON `blocks`;

-- DropIndex
DROP INDEX `blocks_uuid_key` ON `blocks`;

-- DropIndex
DROP INDEX `booking_stages_customer_id_fkey` ON `booking_stages`;

-- DropIndex
DROP INDEX `booking_stages_flat_id_fkey` ON `booking_stages`;

-- DropIndex
DROP INDEX `column_store_uuid_key` ON `column_store`;

-- DropIndex
DROP INDEX `coupon_gifts_project_id_fkey` ON `coupon_gifts`;

-- DropIndex
DROP INDEX `customer_address_country_fkey` ON `customer_address`;

-- DropIndex
DROP INDEX `customer_address_customer_id_fkey` ON `customer_address`;

-- DropIndex
DROP INDEX `customer_flat_customer_id_fkey` ON `customer_flat`;

-- DropIndex
DROP INDEX `customer_flat_flat_id_fkey` ON `customer_flat`;

-- DropIndex
DROP INDEX `customer_flat_update_activities_customerflat_id_fkey` ON `customer_flat_update_activities`;

-- DropIndex
DROP INDEX `customer_flat_update_activities_employee_id_fkey` ON `customer_flat_update_activities`;

-- DropIndex
DROP INDEX `customeractivities_customer_id_fkey` ON `customeractivities`;

-- DropIndex
DROP INDEX `customeractivities_employee_id_fkey` ON `customeractivities`;

-- DropIndex
DROP INDEX `customerfilemanager_added_by_fkey` ON `customerfilemanager`;

-- DropIndex
DROP INDEX `customerfilemanager_customer_id_fkey` ON `customerfilemanager`;

-- DropIndex
DROP INDEX `customerfilemanager_uuid_key` ON `customerfilemanager`;

-- DropIndex
DROP INDEX `customernotes_customer_id_fkey` ON `customernotes`;

-- DropIndex
DROP INDEX `customernotes_user_id_fkey` ON `customernotes`;

-- DropIndex
DROP INDEX `customers_added_by_employee_id_fkey` ON `customers`;

-- DropIndex
DROP INDEX `customers_country_of_citizenship_fkey` ON `customers`;

-- DropIndex
DROP INDEX `customers_country_of_residence_fkey` ON `customers`;

-- DropIndex
DROP INDEX `customers_project_id_fkey` ON `customers`;

-- DropIndex
DROP INDEX `customers_uuid_key` ON `customers`;

-- DropIndex
DROP INDEX `employee_project_permissions_employee_id_fkey` ON `employee_project_permissions`;

-- DropIndex
DROP INDEX `employee_project_permissions_project_id_fkey` ON `employee_project_permissions`;

-- DropIndex
DROP INDEX `employees_reporting_head_id_fkey` ON `employees`;

-- DropIndex
DROP INDEX `employees_role_id_fkey` ON `employees`;

-- DropIndex
DROP INDEX `employees_uuid_key` ON `employees`;

-- DropIndex
DROP INDEX `flatfilemanager_added_by_fkey` ON `flatfilemanager`;

-- DropIndex
DROP INDEX `flatfilemanager_flat_id_fkey` ON `flatfilemanager`;

-- DropIndex
DROP INDEX `flatfilemanager_uuid_key` ON `flatfilemanager`;

-- DropIndex
DROP INDEX `flatnotes_flat_id_fkey` ON `flatnotes`;

-- DropIndex
DROP INDEX `flatnotes_user_id_fkey` ON `flatnotes`;

-- DropIndex
DROP INDEX `flats_added_by_employee_id_fkey` ON `flats`;

-- DropIndex
DROP INDEX `flats_block_id_fkey` ON `flats`;

-- DropIndex
DROP INDEX `flats_customer_id_fkey` ON `flats`;

-- DropIndex
DROP INDEX `flats_group_owner_id_fkey` ON `flats`;

-- DropIndex
DROP INDEX `flats_project_id_fkey` ON `flats`;

-- DropIndex
DROP INDEX `flats_uuid_key` ON `flats`;

-- DropIndex
DROP INDEX `group_owner_uuid_key` ON `group_owner`;

-- DropIndex
DROP INDEX `lead_transfer_from_employee_id_fkey` ON `lead_transfer`;

-- DropIndex
DROP INDEX `lead_transfer_lead_id_fkey` ON `lead_transfer`;

-- DropIndex
DROP INDEX `lead_transfer_to_employee_id_fkey` ON `lead_transfer`;

-- DropIndex
DROP INDEX `lead_transfer_transfered_by_fkey` ON `lead_transfer`;

-- DropIndex
DROP INDEX `leads_added_by_employee_id_fkey` ON `leads`;

-- DropIndex
DROP INDEX `leads_assigned_to_employee_id_fkey` ON `leads`;

-- DropIndex
DROP INDEX `leads_country_of_citizenship_fkey` ON `leads`;

-- DropIndex
DROP INDEX `leads_country_of_residence_fkey` ON `leads`;

-- DropIndex
DROP INDEX `leads_lead_stage_id_fkey` ON `leads`;

-- DropIndex
DROP INDEX `leads_project_id_fkey` ON `leads`;

-- DropIndex
DROP INDEX `leads_uuid_key` ON `leads`;

-- DropIndex
DROP INDEX `leads_activities_employee_id_fkey` ON `leads_activities`;

-- DropIndex
DROP INDEX `leads_activities_lead_id_fkey` ON `leads_activities`;

-- DropIndex
DROP INDEX `leads_address_country_fkey` ON `leads_address`;

-- DropIndex
DROP INDEX `leads_address_lead_id_fkey` ON `leads_address`;

-- DropIndex
DROP INDEX `leads_file_manager_added_by_fkey` ON `leads_file_manager`;

-- DropIndex
DROP INDEX `leads_file_manager_lead_id_fkey` ON `leads_file_manager`;

-- DropIndex
DROP INDEX `leads_file_manager_uuid_key` ON `leads_file_manager`;

-- DropIndex
DROP INDEX `leads_notes_employee_id_fkey` ON `leads_notes`;

-- DropIndex
DROP INDEX `leads_notes_lead_id_fkey` ON `leads_notes`;

-- DropIndex
DROP INDEX `leads_profession_lead_id_fkey` ON `leads_profession`;

-- DropIndex
DROP INDEX `parsedpayments_uuid_key` ON `parsedpayments`;

-- DropIndex
DROP INDEX `payments_added_by_employee_id_fkey` ON `payments`;

-- DropIndex
DROP INDEX `payments_customer_id_fkey` ON `payments`;

-- DropIndex
DROP INDEX `payments_flat_id_fkey` ON `payments`;

-- DropIndex
DROP INDEX `payments_project_id_fkey` ON `payments`;

-- DropIndex
DROP INDEX `payments_uuid_key` ON `payments`;

-- DropIndex
DROP INDEX `profession_customer_id_fkey` ON `profession`;

-- DropIndex
DROP INDEX `project_employee_id_fkey` ON `project`;

-- DropIndex
DROP INDEX `project_uuid_key` ON `project`;

-- DropIndex
DROP INDEX `refund_ageing_record_customer_id_fkey` ON `refund_ageing_record`;

-- DropIndex
DROP INDEX `refund_ageing_record_flat_id_fkey` ON `refund_ageing_record`;

-- DropIndex
DROP INDEX `refund_ageing_record_project_id_fkey` ON `refund_ageing_record`;

-- DropIndex
DROP INDEX `rewards_customer_id_fkey` ON `rewards`;

-- DropIndex
DROP INDEX `rewards_employee_id_fkey` ON `rewards`;

-- DropIndex
DROP INDEX `rewards_flat_id_fkey` ON `rewards`;

-- DropIndex
DROP INDEX `rewards_project_id_fkey` ON `rewards`;

-- DropIndex
DROP INDEX `taskactivities_employee_id_fkey` ON `taskactivities`;

-- DropIndex
DROP INDEX `taskactivities_flat_id_fkey` ON `taskactivities`;

-- AlterTable
ALTER TABLE `ageing_record` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `customer_flat` VARCHAR(191) NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `agreement_template` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `amenities` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `backup_data` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `backup_schedule` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `banks_list` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `blocks` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `booking_stages` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `column_store` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `company_info` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `countries` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `coupon_gifts` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customer_address` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `country` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customer_flat` DROP PRIMARY KEY,
    ADD COLUMN `cost_sheet_path` VARCHAR(191) NULL,
    ADD COLUMN `cost_sheet_url` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customer_flat_update_activities` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    MODIFY `customerflat_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customeractivities` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customerfilemanager` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `parent_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `added_by` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customernotes` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `user_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `customers` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `country_of_citizenship` VARCHAR(191) NULL,
    MODIFY `country_of_residence` VARCHAR(191) NULL,
    MODIFY `added_by_employee_id` VARCHAR(191) NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `employee_project_permissions` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `employees` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `reporting_head_id` VARCHAR(191) NULL,
    MODIFY `role_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `flatfilemanager` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `parent_id` VARCHAR(191) NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `added_by` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `flatnotes` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `user_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `flats` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    MODIFY `block_id` VARCHAR(191) NULL,
    MODIFY `group_owner_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `added_by_employee_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `group_owner` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `lead_stages` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `lead_transfer` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `from_employee_id` VARCHAR(191) NULL,
    MODIFY `to_employee_id` VARCHAR(191) NULL,
    MODIFY `lead_id` VARCHAR(191) NULL,
    MODIFY `transfered_by` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `leads` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `country_of_citizenship` VARCHAR(191) NULL,
    MODIFY `country_of_residence` VARCHAR(191) NULL,
    MODIFY `assigned_to_employee_id` VARCHAR(191) NULL,
    MODIFY `lead_stage_id` VARCHAR(191) NULL,
    MODIFY `added_by_employee_id` VARCHAR(191) NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `leads_activities` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `lead_id` VARCHAR(191) NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `leads_address` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `lead_id` VARCHAR(191) NULL,
    MODIFY `country` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `leads_file_manager` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `parent_id` VARCHAR(191) NULL,
    MODIFY `lead_id` VARCHAR(191) NULL,
    MODIFY `added_by` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `leads_notes` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `lead_id` VARCHAR(191) NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `leads_profession` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `lead_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `parsedpayments` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    ADD COLUMN `added_by_employee_id` VARCHAR(191) NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `payments` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `added_by_employee_id` VARCHAR(191) NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `profession` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `project` DROP PRIMARY KEY,
    DROP COLUMN `uuid`,
    ADD COLUMN `corpus_fund` DOUBLE NULL,
    ADD COLUMN `documentation_fee` DOUBLE NULL,
    ADD COLUMN `gst_percentage` DOUBLE NULL,
    ADD COLUMN `maintenance_duration_months` DOUBLE NULL,
    ADD COLUMN `maintenance_rate_per_sqft` DOUBLE NULL,
    ADD COLUMN `manjeera_connection_charges` DOUBLE NULL,
    ADD COLUMN `manjeera_meter_charges` DOUBLE NULL,
    ADD COLUMN `registration_base_charge` DOUBLE NULL,
    ADD COLUMN `registration_percentage` DOUBLE NULL,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `refund_ageing_record` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `rewards` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `project_id` VARCHAR(191) NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    MODIFY `customer_id` VARCHAR(191) NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `role_permissions` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `role_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `roles` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `sale_deed_tempalte` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `taskactivities` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    MODIFY `flat_id` VARCHAR(191) NULL,
    MODIFY `employee_id` VARCHAR(191) NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_reporting_head_id_fkey` FOREIGN KEY (`reporting_head_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_country_of_citizenship_fkey` FOREIGN KEY (`country_of_citizenship`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_country_of_residence_fkey` FOREIGN KEY (`country_of_residence`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_added_by_employee_id_fkey` FOREIGN KEY (`added_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_flat` ADD CONSTRAINT `customer_flat_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_flat` ADD CONSTRAINT `customer_flat_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profession` ADD CONSTRAINT `profession_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_country_fkey` FOREIGN KEY (`country`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_group_owner_id_fkey` FOREIGN KEY (`group_owner_id`) REFERENCES `group_owner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_block_id_fkey` FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_added_by_employee_id_fkey` FOREIGN KEY (`added_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `project_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_project_permissions` ADD CONSTRAINT `employee_project_permissions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_project_permissions` ADD CONSTRAINT `employee_project_permissions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_added_by_employee_id_fkey` FOREIGN KEY (`added_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `parsedpayments` ADD CONSTRAINT `parsedpayments_added_by_employee_id_fkey` FOREIGN KEY (`added_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flatnotes` ADD CONSTRAINT `flatnotes_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flatnotes` ADD CONSTRAINT `flatnotes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskactivities` ADD CONSTRAINT `taskactivities_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `taskactivities` ADD CONSTRAINT `taskactivities_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flatfilemanager` ADD CONSTRAINT `flatfilemanager_added_by_fkey` FOREIGN KEY (`added_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flatfilemanager` ADD CONSTRAINT `flatfilemanager_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customerfilemanager` ADD CONSTRAINT `customerfilemanager_added_by_fkey` FOREIGN KEY (`added_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customerfilemanager` ADD CONSTRAINT `customerfilemanager_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customernotes` ADD CONSTRAINT `customernotes_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customernotes` ADD CONSTRAINT `customernotes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customeractivities` ADD CONSTRAINT `customeractivities_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customeractivities` ADD CONSTRAINT `customeractivities_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_flat_update_activities` ADD CONSTRAINT `customer_flat_update_activities_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_flat_update_activities` ADD CONSTRAINT `customer_flat_update_activities_customerflat_id_fkey` FOREIGN KEY (`customerflat_id`) REFERENCES `customer_flat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_stages` ADD CONSTRAINT `booking_stages_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_stages` ADD CONSTRAINT `booking_stages_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_country_of_citizenship_fkey` FOREIGN KEY (`country_of_citizenship`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_country_of_residence_fkey` FOREIGN KEY (`country_of_residence`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_assigned_to_employee_id_fkey` FOREIGN KEY (`assigned_to_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_lead_stage_id_fkey` FOREIGN KEY (`lead_stage_id`) REFERENCES `lead_stages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_added_by_employee_id_fkey` FOREIGN KEY (`added_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_profession` ADD CONSTRAINT `leads_profession_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_address` ADD CONSTRAINT `leads_address_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_address` ADD CONSTRAINT `leads_address_country_fkey` FOREIGN KEY (`country`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_activities` ADD CONSTRAINT `leads_activities_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_activities` ADD CONSTRAINT `leads_activities_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_notes` ADD CONSTRAINT `leads_notes_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_notes` ADD CONSTRAINT `leads_notes_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_file_manager` ADD CONSTRAINT `leads_file_manager_added_by_fkey` FOREIGN KEY (`added_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_file_manager` ADD CONSTRAINT `leads_file_manager_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_transfer` ADD CONSTRAINT `lead_transfer_from_employee_id_fkey` FOREIGN KEY (`from_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_transfer` ADD CONSTRAINT `lead_transfer_to_employee_id_fkey` FOREIGN KEY (`to_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_transfer` ADD CONSTRAINT `lead_transfer_transfered_by_fkey` FOREIGN KEY (`transfered_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lead_transfer` ADD CONSTRAINT `lead_transfer_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_customer_flat_fkey` FOREIGN KEY (`customer_flat`) REFERENCES `customer_flat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_ageing_record` ADD CONSTRAINT `refund_ageing_record_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_ageing_record` ADD CONSTRAINT `refund_ageing_record_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refund_ageing_record` ADD CONSTRAINT `refund_ageing_record_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupon_gifts` ADD CONSTRAINT `coupon_gifts_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rewards` ADD CONSTRAINT `rewards_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
