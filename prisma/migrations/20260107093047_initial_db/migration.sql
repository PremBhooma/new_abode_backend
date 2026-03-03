-- CreateTable
CREATE TABLE `employees` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(191) NULL,
    `name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `password` VARCHAR(300) NULL,
    `phone_code` VARCHAR(10) NULL,
    `phone_number` VARCHAR(100) NULL,
    `gender` ENUM('Male', 'Female') NULL,
    `employee_status` ENUM('Active', 'Inactive', 'Suspended') NULL DEFAULT 'Active',
    `reporting_head_id` BIGINT NULL,
    `otp` VARCHAR(10) NULL,
    `is_verified` BOOLEAN NULL DEFAULT false,
    `role_id` BIGINT NULL,
    `otp_expiry` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `profile_pic_url` VARCHAR(191) NULL,
    `profile_pic_path` VARCHAR(191) NULL,

    UNIQUE INDEX `employees_uuid_key`(`uuid`),
    UNIQUE INDEX `employees_email_key`(`email`),
    INDEX `employees_name_index`(`name`),
    INDEX `employees_phone_index`(`phone_code`, `phone_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `default_role` BOOLEAN NULL DEFAULT false,
    `status` ENUM('Active', 'Inactive') NULL DEFAULT 'Active',
    `soft_delete` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `roles_name_index`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `role_id` BIGINT NULL,
    `permissions` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `rolepermissions_role_id_index`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NULL,
    `profile_pic_url` VARCHAR(191) NULL,
    `profile_pic_path` VARCHAR(191) NULL,
    `prefixes` ENUM('Mr', 'Mrs', 'Miss', 'Mx') NULL,
    `first_name` VARCHAR(255) NULL,
    `last_name` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `email_2` VARCHAR(255) NULL,
    `phone_code` VARCHAR(10) NULL,
    `phone_number` VARCHAR(100) NULL,
    `gender` ENUM('Male', 'Female') NULL,
    `landline_country_code` VARCHAR(10) NULL,
    `landline_city_code` VARCHAR(10) NULL,
    `landline_number` VARCHAR(100) NULL,
    `date_of_birth` DATE NULL,
    `father_name` VARCHAR(255) NULL,
    `spouse_prefixes` ENUM('Mr', 'Mrs', 'Miss', 'Mx') NULL,
    `spouse_name` VARCHAR(255) NULL,
    `marital_status` ENUM('Single', 'Married') NULL,
    `number_of_children` INTEGER NULL,
    `wedding_aniversary` DATETIME(3) NULL,
    `spouse_dob` DATETIME(3) NULL,
    `pan_card_no` VARCHAR(20) NULL,
    `aadhar_card_no` VARCHAR(30) NULL,
    `country_of_citizenship` BIGINT NULL,
    `country_of_residence` BIGINT NULL,
    `mother_tongue` VARCHAR(100) NULL,
    `name_of_poa` VARCHAR(100) NULL,
    `holder_poa` ENUM('Resident', 'NRI') NULL,
    `no_of_years_correspondence_address` INTEGER NULL,
    `no_of_years_city` INTEGER NULL,
    `have_you_owned_abode` BOOLEAN NULL DEFAULT false,
    `if_owned_project_name` VARCHAR(255) NULL,
    `source_of_lead` VARCHAR(191) NULL,
    `status` ENUM('Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active',
    `soft_delete` INTEGER NOT NULL DEFAULT 0,
    `added_by_employee_id` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `customers_uuid_key`(`uuid`),
    UNIQUE INDEX `customers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_flat` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `flat_id` BIGINT NULL,
    `customer_id` BIGINT NULL,
    `saleable_area_sq_ft` INTEGER NULL,
    `rate_per_sq_ft` INTEGER NULL,
    `discount` DOUBLE NULL,
    `base_cost_unit` INTEGER NULL,
    `application_date` DATETIME(3) NULL,
    `amenities` DOUBLE NULL,
    `toatlcostofuint` DOUBLE NULL,
    `gst` DOUBLE NULL,
    `costofunitwithtax` DOUBLE NULL,
    `registrationcharge` DOUBLE NULL,
    `maintenancecharge` DOUBLE NULL,
    `documentaionfee` DOUBLE NULL,
    `corpusfund` DOUBLE NULL,
    `floor_rise_per_sq_ft` DOUBLE NULL,
    `total_floor_rise` DOUBLE NULL,
    `east_facing_per_sq_ft` DOUBLE NULL,
    `total_east_facing` DOUBLE NULL,
    `corner_per_sq_ft` DOUBLE NULL,
    `total_corner` DOUBLE NULL,
    `grand_total` DOUBLE NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profession` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `current_designation` VARCHAR(250) NULL,
    `name_of_current_organization` VARCHAR(250) NULL,
    `address_of_current_organization` TEXT NULL,
    `no_of_years_work_experience` DOUBLE NULL,
    `current_annual_income` DOUBLE NULL,
    `customer_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_address` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NULL,
    `address_type` ENUM('Permanent', 'Correspondence') NULL,
    `address` TEXT NULL,
    `city` INTEGER NULL,
    `state` INTEGER NULL,
    `country` BIGINT NULL,
    `pincode` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NULL,
    `state_id` INTEGER NULL,
    `country_id` INTEGER NULL,
    `latitude` VARCHAR(100) NULL,
    `longitude` VARCHAR(100) NULL,
    `mobile` VARCHAR(50) NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `city_meta_tags` TEXT NOT NULL,
    `order_no` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `states` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NULL,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `iso2` VARCHAR(100) NULL,
    `country_id` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(250) NULL,
    `iso3` VARCHAR(3) NULL,
    `iso2` VARCHAR(2) NULL,
    `phone_code` VARCHAR(10) NULL,
    `currency` VARCHAR(100) NULL,
    `currency_symbol` VARCHAR(10) NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `flag` TEXT NULL,
    `timezone_name` VARCHAR(255) NULL,
    `timezone_utc` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    INDEX `country_name`(`name`),
    INDEX `phone_code`(`phone_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flats` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NULL,
    `project_id` BIGINT NULL,
    `flat_no` VARCHAR(255) NULL,
    `block_id` BIGINT NULL,
    `floor_no` VARCHAR(255) NULL,
    `square_feet` DECIMAL(10, 2) NULL,
    `type` ENUM('Studio', 'OneBHK', 'OnePointFiveBHK', 'TwoBHK', 'TwoPointFiveBHK', 'ThreeBHK', 'ThreePointFiveBHK', 'FourBHK', 'FourPointFiveBHK', 'FiveBHK', 'Penthouse', 'Duplex') NULL,
    `facing` ENUM('North', 'South', 'East', 'West', 'NorthEast', 'NorthWest', 'SouthEast', 'SouthWest') NULL,
    `east_face` VARCHAR(255) NULL,
    `west_face` VARCHAR(255) NULL,
    `north_face` VARCHAR(255) NULL,
    `south_face` VARCHAR(255) NULL,
    `bedrooms` INTEGER NULL,
    `bathrooms` INTEGER NULL,
    `balconies` INTEGER NULL,
    `parking` DECIMAL(10, 2) NULL,
    `furnished_status` ENUM('Furnished', 'SemiFurnished', 'Unfurnished') NULL,
    `description` TEXT NULL,
    `udl` VARCHAR(255) NULL,
    `group_owner_id` BIGINT NULL,
    `corner` BOOLEAN NULL DEFAULT false,
    `mortgage` BOOLEAN NULL DEFAULT false,
    `floor_rise` BOOLEAN NULL DEFAULT false,
    `deed_number` VARCHAR(255) NULL,
    `google_map_link` VARCHAR(255) NULL,
    `status` ENUM('Sold', 'Unsold') NULL DEFAULT 'Unsold',
    `flat_img_url` VARCHAR(191) NULL,
    `flat_img_path` VARCHAR(191) NULL,
    `totalAmount` DOUBLE NULL,
    `paidAmount` DOUBLE NULL DEFAULT 0,
    `customer_id` BIGINT NULL,
    `added_by_employee_id` BIGINT NULL,
    `word_agreement_template_path` VARCHAR(191) NULL,
    `word_agreement_template_url` VARCHAR(191) NULL,
    `pdf_agreement_template_path` VARCHAR(191) NULL,
    `pdf_agreement_template_url` VARCHAR(191) NULL,
    `word_sale_deed_template_path` VARCHAR(191) NULL,
    `word_sale_deed_template_url` VARCHAR(191) NULL,
    `pdf_sale_deed_template_path` VARCHAR(191) NULL,
    `pdf_sale_deed_template_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `flats_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_info` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `companyname` VARCHAR(255) NULL,
    `address_one` TEXT NULL,
    `address_two` TEXT NULL,
    `city` VARCHAR(255) NULL,
    `state` VARCHAR(255) NULL,
    `country` VARCHAR(255) NULL,
    `zipcode` VARCHAR(255) NULL,
    `phone_code` VARCHAR(191) NULL,
    `phone_number` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `white_logo_url` VARCHAR(255) NULL,
    `white_logo_path` VARCHAR(255) NULL,
    `dark_logo_url` VARCHAR(255) NULL,
    `dark_logo_path` VARCHAR(255) NULL,
    `favicon_url` VARCHAR(255) NULL,
    `favicon_path` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NULL,
    `project_name` VARCHAR(255) NULL,
    `project_address` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `project_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blocks` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NULL,
    `block_name` VARCHAR(255) NULL,
    `project_id` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `blocks_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NULL,
    `flat_id` BIGINT NULL,
    `customer_id` BIGINT NULL,
    `amount` DOUBLE NULL,
    `payment_type` VARCHAR(191) NULL,
    `payment_towards` VARCHAR(191) NULL,
    `payment_method` VARCHAR(191) NULL,
    `bank` VARCHAR(191) NULL,
    `payment_date` DATETIME(3) NULL,
    `trasnaction_id` VARCHAR(191) NULL,
    `receipt_path` VARCHAR(191) NULL,
    `receipt_url` VARCHAR(191) NULL,
    `comment` VARCHAR(191) NULL,
    `added_by_employee_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `payments_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `parsedpayments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NULL,
    `amount` DOUBLE NULL,
    `payment_type` VARCHAR(191) NULL,
    `payment_towards` VARCHAR(191) NULL,
    `payment_method` VARCHAR(191) NULL,
    `bank` VARCHAR(191) NULL,
    `payment_date` DATETIME(3) NULL,
    `transaction_id` VARCHAR(191) NULL,
    `flat` VARCHAR(191) NULL,
    `block` VARCHAR(191) NULL,
    `comment` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `parsedpayments_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flatnotes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `flat_id` BIGINT NULL,
    `user_id` BIGINT NULL,
    `note_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `taskactivities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `flat_id` BIGINT NULL,
    `employee_id` BIGINT NULL,
    `ta_message` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `color_code` TEXT NULL,
    `employee_short_name` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `flatfilemanager` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(500) NULL,
    `name` VARCHAR(255) NULL,
    `file_icon_type` VARCHAR(255) NULL,
    `file_type` VARCHAR(255) NULL,
    `file_size` INTEGER NULL,
    `file_path` TEXT NULL,
    `file_url` TEXT NULL,
    `parent_id` BIGINT NULL,
    `flat_id` BIGINT NULL,
    `added_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `flatfilemanager_uuid_key`(`uuid`),
    INDEX `flatfilemanager_parent_id_index`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customerfilemanager` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(500) NULL,
    `name` VARCHAR(255) NULL,
    `file_icon_type` VARCHAR(255) NULL,
    `file_type` VARCHAR(255) NULL,
    `file_size` INTEGER NULL,
    `file_path` TEXT NULL,
    `file_url` TEXT NULL,
    `parent_id` BIGINT NULL,
    `customer_id` BIGINT NULL,
    `added_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `customerfilemanager_uuid_key`(`uuid`),
    INDEX `customerfilemanager_parent_id_index`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customernotes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NULL,
    `user_id` BIGINT NULL,
    `note_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customeractivities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `customer_id` BIGINT NULL,
    `employee_id` BIGINT NULL,
    `ca_message` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `color_code` TEXT NULL,
    `employee_short_name` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `column_store` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(500) NULL,
    `employee_id` BIGINT NULL,
    `page_name` VARCHAR(255) NULL,
    `columns` JSON NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `column_store_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_data` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(500) NULL,
    `backup_name` VARCHAR(255) NULL,
    `backup_path` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `backup_data_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_schedule` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `schedule` ENUM('twoMinutes', 'fiveMinutes', 'Daily', 'Weekly', 'Monthly') NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `group_owner` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(500) NULL,
    `name` VARCHAR(255) NULL,
    `isDefault` BOOLEAN NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `group_owner_uuid_key`(`uuid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `amenities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `amount` DOUBLE NULL,
    `flat_type` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customer_flat_update_activities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `employee_id` BIGINT NULL,
    `customerflat_id` BIGINT NULL,
    `message` TEXT NULL,
    `updated_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_stages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `flat_id` BIGINT NULL,
    `customer_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(255) NULL,
    `profile_pic_url` VARCHAR(191) NULL,
    `profile_pic_path` VARCHAR(191) NULL,
    `prefixes` ENUM('Mr', 'Mrs', 'Miss', 'Mx') NULL,
    `full_name` VARCHAR(500) NULL,
    `email` VARCHAR(255) NULL,
    `email_2` VARCHAR(255) NULL,
    `phone_code` VARCHAR(10) NULL,
    `phone_number` VARCHAR(100) NULL,
    `gender` ENUM('Male', 'Female') NULL,
    `landline_country_code` VARCHAR(10) NULL,
    `landline_city_code` VARCHAR(10) NULL,
    `landline_number` VARCHAR(100) NULL,
    `date_of_birth` DATE NULL,
    `father_name` VARCHAR(255) NULL,
    `spouse_prefixes` ENUM('Mr', 'Mrs', 'Miss', 'Mx') NULL,
    `spouse_name` VARCHAR(255) NULL,
    `marital_status` ENUM('Single', 'Married') NULL,
    `number_of_children` INTEGER NULL,
    `wedding_aniversary` DATETIME(3) NULL,
    `spouse_dob` DATETIME(3) NULL,
    `pan_card_no` VARCHAR(20) NULL,
    `aadhar_card_no` VARCHAR(30) NULL,
    `country_of_citizenship` BIGINT NULL,
    `country_of_residence` BIGINT NULL,
    `mother_tongue` VARCHAR(100) NULL,
    `name_of_poa` VARCHAR(100) NULL,
    `holder_poa` ENUM('Resident', 'NRI') NULL,
    `no_of_years_correspondence_address` INTEGER NULL,
    `no_of_years_city` INTEGER NULL,
    `have_you_owned_abode` BOOLEAN NULL DEFAULT false,
    `if_owned_project_name` VARCHAR(255) NULL,
    `assigned_to_employee_id` BIGINT NULL,
    `source_of_lead` VARCHAR(255) NULL,
    `lead_stage_id` BIGINT NULL,
    `status` ENUM('Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active',
    `added_by_employee_id` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `lead_assigned_date` DATETIME(3) NULL,

    UNIQUE INDEX `leads_uuid_key`(`uuid`),
    UNIQUE INDEX `leads_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads_profession` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `current_designation` VARCHAR(250) NULL,
    `name_of_current_organization` VARCHAR(250) NULL,
    `address_of_current_organization` TEXT NULL,
    `no_of_years_work_experience` DOUBLE NULL,
    `current_annual_income` DOUBLE NULL,
    `lead_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads_address` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NULL,
    `address_type` ENUM('Permanent', 'Correspondence') NULL,
    `address` TEXT NULL,
    `city` INTEGER NULL,
    `state` INTEGER NULL,
    `country` BIGINT NULL,
    `pincode` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads_activities` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NULL,
    `employee_id` BIGINT NULL,
    `ca_message` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `color_code` TEXT NULL,
    `employee_short_name` TEXT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads_notes` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `lead_id` BIGINT NULL,
    `employee_id` BIGINT NULL,
    `note_message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leads_file_manager` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `uuid` VARCHAR(500) NULL,
    `name` VARCHAR(255) NULL,
    `file_icon_type` VARCHAR(255) NULL,
    `file_type` VARCHAR(255) NULL,
    `file_size` INTEGER NULL,
    `file_path` TEXT NULL,
    `file_url` TEXT NULL,
    `parent_id` BIGINT NULL,
    `lead_id` BIGINT NULL,
    `added_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `leads_file_manager_uuid_key`(`uuid`),
    INDEX `leadfilemanager_parent_id_index`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_deed_tempalte` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(191) NULL,
    `file_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `agreement_template` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(191) NULL,
    `file_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_stages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `order` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `lead_stages_order_key`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lead_transfer` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `from_employee_id` BIGINT NULL,
    `to_employee_id` BIGINT NULL,
    `lead_id` BIGINT NULL,
    `transfered_by` BIGINT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
ALTER TABLE `customer_flat` ADD CONSTRAINT `customer_flat_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_flat` ADD CONSTRAINT `customer_flat_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profession` ADD CONSTRAINT `profession_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_city_fkey` FOREIGN KEY (`city`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_state_fkey` FOREIGN KEY (`state`) REFERENCES `states`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_country_fkey` FOREIGN KEY (`country`) REFERENCES `countries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_group_owner_id_fkey` FOREIGN KEY (`group_owner_id`) REFERENCES `group_owner`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_block_id_fkey` FOREIGN KEY (`block_id`) REFERENCES `blocks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `flats` ADD CONSTRAINT `flats_added_by_employee_id_fkey` FOREIGN KEY (`added_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_flat_id_fkey` FOREIGN KEY (`flat_id`) REFERENCES `flats`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_added_by_employee_id_fkey` FOREIGN KEY (`added_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE `leads_profession` ADD CONSTRAINT `leads_profession_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_address` ADD CONSTRAINT `leads_address_lead_id_fkey` FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_address` ADD CONSTRAINT `leads_address_city_fkey` FOREIGN KEY (`city`) REFERENCES `cities`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `leads_address` ADD CONSTRAINT `leads_address_state_fkey` FOREIGN KEY (`state`) REFERENCES `states`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
