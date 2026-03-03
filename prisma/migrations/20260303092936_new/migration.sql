-- AlterTable
ALTER TABLE `ageing_record` ADD COLUMN `advance_payment` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `bank_agreement` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `customer_balance_payment` DOUBLE NULL,
    ADD COLUMN `disbursement` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `loan_approved_amount` DOUBLE NULL,
    MODIFY `loan_Status` ENUM('NotApplied', 'Applied', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'NotApplied';

-- AlterTable
ALTER TABLE `customer_flat` ADD COLUMN `manjeera_meter_charge` DOUBLE NULL;

-- AlterTable
ALTER TABLE `customers` ADD COLUMN `loan_rejected` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `project_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `flats` ADD COLUMN `advance_payment` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `flat_reward` BOOLEAN NULL DEFAULT false;

-- AlterTable
ALTER TABLE `leads` ADD COLUMN `project_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `project` ADD COLUMN `employee_id` BIGINT NULL,
    ADD COLUMN `project_rewards` BOOLEAN NULL DEFAULT false;

-- CreateTable
CREATE TABLE `employee_project_permissions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT NULL,
    `project_id` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banks_list` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund_ageing_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NULL,
    `flat_id` BIGINT NULL,
    `customer_id` BIGINT NULL,
    `refund_amount` DOUBLE NULL,
    `refund_date` DATETIME(3) NULL,
    `refund_transactionid` VARCHAR(191) NULL,
    `refund_status` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coupon_gifts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NULL,
    `name` VARCHAR(191) NULL,
    `coupon_gift_pic_url` VARCHAR(191) NULL,
    `coupon_gift_pic_path` VARCHAR(191) NULL,
    `coupon_gift_id` VARCHAR(191) NULL,
    `coupon_gift_status` ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rewards` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `project_id` BIGINT NULL,
    `employee_id` BIGINT NULL,
    `customer_id` BIGINT NULL,
    `flat_id` BIGINT NULL,
    `employee_otp` VARCHAR(191) NULL,
    `customer_otp` VARCHAR(191) NULL,
    `employee_otp_verified` BOOLEAN NOT NULL DEFAULT false,
    `customer_otp_verified` BOOLEAN NOT NULL DEFAULT false,
    `coupon_name` VARCHAR(191) NULL,
    `coupon_gift_id` VARCHAR(191) NULL,
    `coupon_gift_pic_url` VARCHAR(191) NULL,
    `coupon_gift_pic_path` VARCHAR(191) NULL,
    `rewards_step` INTEGER NULL,
    `received_reward` BOOLEAN NOT NULL DEFAULT false,
    `received_reward_date` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customers` ADD CONSTRAINT `customers_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project` ADD CONSTRAINT `project_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_project_permissions` ADD CONSTRAINT `employee_project_permissions_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_project_permissions` ADD CONSTRAINT `employee_project_permissions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads` ADD CONSTRAINT `leads_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
