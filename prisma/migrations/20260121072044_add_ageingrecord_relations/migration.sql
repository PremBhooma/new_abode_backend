-- CreateTable
CREATE TABLE `ageing_record` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `flat_id` BIGINT NULL,
    `customer_id` BIGINT NULL,
    `customer_flat` BIGINT NULL,
    `booking_date` DATETIME(3) NULL,
    `total_amount` DOUBLE NULL,
    `loan_Status` BOOLEAN NULL,
    `bank_name` VARCHAR(191) NULL,
    `agent_name` VARCHAR(191) NULL,
    `agent_contact` VARCHAR(191) NULL,
    `agent_number` VARCHAR(191) NULL,
    `loan_amount` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ageing_record` ADD CONSTRAINT `ageing_record_customer_flat_fkey` FOREIGN KEY (`customer_flat`) REFERENCES `customer_flat`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
