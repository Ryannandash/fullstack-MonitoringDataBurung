ALTER TABLE `users`
  MODIFY `role` VARCHAR(32) NOT NULL DEFAULT 'keeper';

ALTER TABLE `perpindahan`
  ADD COLUMN `review_note` LONGTEXT NULL;

ALTER TABLE `breedingrecord`
  ADD COLUMN `user_id` INTEGER NULL,
  ADD INDEX `breedingrecord_user_id_idx` (`user_id`),
  ADD CONSTRAINT `breedingrecord_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `feeding_types` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `unit` VARCHAR(24) NOT NULL DEFAULT 'kg',
  `description` LONGTEXT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `feeding_types_name_key` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `feeding_schedule`
  ADD COLUMN `feeding_type_id` INTEGER NULL,
  ADD INDEX `feeding_schedule_feeding_type_id_idx` (`feeding_type_id`),
  ADD CONSTRAINT `feeding_schedule_feeding_type_id_fkey`
    FOREIGN KEY (`feeding_type_id`) REFERENCES `feeding_types`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `feeding_history` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `feeding_schedule_id` INTEGER NULL,
  `bird_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `feed_type` VARCHAR(100) NOT NULL,
  `amount` DOUBLE NOT NULL,
  `unit` VARCHAR(24) NOT NULL DEFAULT 'kg',
  `fed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `notes` LONGTEXT NULL,
  `photo_url` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `feeding_history_bird_id_fed_at_idx` (`bird_id`, `fed_at`),
  INDEX `feeding_history_user_id_fed_at_idx` (`user_id`, `fed_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `feeding_history_feeding_schedule_id_fkey`
    FOREIGN KEY (`feeding_schedule_id`) REFERENCES `feeding_schedule`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `feeding_history_bird_id_fkey`
    FOREIGN KEY (`bird_id`) REFERENCES `bird`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `feeding_history_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `training_records` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `bird_id` INTEGER NOT NULL,
  `trainer_id` INTEGER NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `technique` LONGTEXT NULL,
  `outcome` LONGTEXT NULL,
  `notes` LONGTEXT NULL,
  `trained_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `photo_url` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `training_records_bird_id_trained_at_idx` (`bird_id`, `trained_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `training_records_bird_id_fkey`
    FOREIGN KEY (`bird_id`) REFERENCES `bird`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `training_records_trainer_id_fkey`
    FOREIGN KEY (`trainer_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `cleaning_records` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `habitat_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `cleaned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `area` VARCHAR(120) NOT NULL,
  `checklist` LONGTEXT NULL,
  `status` VARCHAR(32) NOT NULL DEFAULT 'Selesai',
  `notes` LONGTEXT NULL,
  `photo_url` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `cleaning_records_habitat_id_cleaned_at_idx` (`habitat_id`, `cleaned_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `cleaning_records_habitat_id_fkey`
    FOREIGN KEY (`habitat_id`) REFERENCES `habitat`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cleaning_records_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `food_requests` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `requested_by_id` INTEGER NOT NULL,
  `handled_by_id` INTEGER NULL,
  `feed_type` VARCHAR(100) NOT NULL,
  `quantity` DOUBLE NULL,
  `unit` VARCHAR(24) NOT NULL DEFAULT 'kg',
  `reason` LONGTEXT NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'MENUNGGU',
  `handler_notes` LONGTEXT NULL,
  `handled_at` DATETIME(3) NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `food_requests_status_created_at_idx` (`status`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `food_requests_requested_by_id_fkey`
    FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `food_requests_handled_by_id_fkey`
    FOREIGN KEY (`handled_by_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `task_assignments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `assigned_by_id` INTEGER NOT NULL,
  `assigned_to_id` INTEGER NOT NULL,
  `bird_id` INTEGER NULL,
  `habitat_id` INTEGER NULL,
  `title` VARCHAR(150) NOT NULL,
  `activity_type` VARCHAR(50) NOT NULL,
  `details` LONGTEXT NULL,
  `due_at` DATETIME(3) NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'DITUGASKAN',
  `completion_note` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `task_assignments_assignee_status_due_idx` (`assigned_to_id`, `status`, `due_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `task_assignments_assigned_by_id_fkey`
    FOREIGN KEY (`assigned_by_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `task_assignments_assigned_to_id_fkey`
    FOREIGN KEY (`assigned_to_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `task_assignments_bird_id_fkey`
    FOREIGN KEY (`bird_id`) REFERENCES `bird`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `task_assignments_habitat_id_fkey`
    FOREIGN KEY (`habitat_id`) REFERENCES `habitat`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `daily_reports` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `report_date` DATE NOT NULL,
  `status` VARCHAR(24) NOT NULL DEFAULT 'DRAFT',
  `submitted_at` DATETIME(3) NULL,
  `reviewer_id` INTEGER NULL,
  `reviewed_at` DATETIME(3) NULL,
  `review_note` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX `daily_reports_user_id_report_date_key` (`user_id`, `report_date`),
  INDEX `daily_reports_report_date_status_idx` (`report_date`, `status`),
  PRIMARY KEY (`id`),
  CONSTRAINT `daily_reports_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `daily_reports_reviewer_id_fkey`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `daily_report_reviews` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `daily_report_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `action` VARCHAR(24) NOT NULL,
  `note` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `daily_report_reviews_report_created_idx` (`daily_report_id`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `daily_report_reviews_daily_report_id_fkey`
    FOREIGN KEY (`daily_report_id`) REFERENCES `daily_reports`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `daily_report_reviews_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `notifications` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NULL,
  `role` VARCHAR(32) NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` LONGTEXT NOT NULL,
  `type` VARCHAR(24) NOT NULL DEFAULT 'INFO',
  `link` VARCHAR(255) NULL,
  `read_at` DATETIME(3) NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `notifications_user_read_created_idx` (`user_id`, `read_at`, `created_at`),
  INDEX `notifications_role_read_created_idx` (`role`, `read_at`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `notifications_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medical_treatments` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `health_record_id` INTEGER NOT NULL,
  `user_id` INTEGER NOT NULL,
  `medicine` VARCHAR(120) NOT NULL,
  `dosage` VARCHAR(120) NOT NULL,
  `duration_days` INTEGER NOT NULL,
  `instructions` LONGTEXT NULL,
  `starts_at` DATETIME(3) NOT NULL,
  `ends_at` DATETIME(3) NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `medical_treatments_health_record_starts_at_idx` (`health_record_id`, `starts_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `medical_treatments_health_record_id_fkey`
    FOREIGN KEY (`health_record_id`) REFERENCES `kesehatan_burung`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `medical_treatments_user_id_fkey`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
