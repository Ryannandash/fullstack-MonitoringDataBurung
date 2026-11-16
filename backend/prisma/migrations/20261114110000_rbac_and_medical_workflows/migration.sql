RENAME TABLE `User` TO `users`;

UPDATE `users`
SET `role` = CASE
  WHEN LOWER(`role`) IN ('admin', 'administrator') THEN 'admin'
  WHEN LOWER(`role`) IN ('dokter_hewan', 'veterinarian', 'doctor', 'vet') THEN 'dokter_hewan'
  ELSE 'keeper'
END;

UPDATE `users` SET `fullName` = `username` WHERE `fullName` IS NULL OR `fullName` = '';
ALTER TABLE `users`
  CHANGE COLUMN `fullName` `nama_lengkap` VARCHAR(100) NOT NULL,
  CHANGE COLUMN `passwordHash` `password` VARCHAR(255) NOT NULL,
  CHANGE COLUMN `username` `username` VARCHAR(50) NOT NULL,
  CHANGE COLUMN `createdAt` `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  ADD COLUMN `email` VARCHAR(100) NULL,
  ADD COLUMN `no_hp` VARCHAR(20) NULL,
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

UPDATE `users` SET `email` = CONCAT(`username`, '@users.jagatsatwa.local');
ALTER TABLE `users`
  MODIFY COLUMN `email` VARCHAR(100) NOT NULL,
  MODIFY COLUMN `role` ENUM('admin', 'keeper', 'dokter_hewan') NOT NULL DEFAULT 'keeper',
  ADD UNIQUE INDEX `users_email_key` (`email`);

RENAME TABLE `HealthRecord` TO `kesehatan_burung`;
ALTER TABLE `kesehatan_burung` DROP FOREIGN KEY `HealthRecord_birdId_fkey`;
UPDATE `kesehatan_burung` SET `condition` = 'dalam_pemulihan' WHERE `condition` = 'pemulihan';
UPDATE `kesehatan_burung`
SET `condition` = CASE
  WHEN LOWER(`condition`) IN ('sehat', 'healthy') THEN 'sehat'
  WHEN LOWER(`condition`) IN ('dalam_pemulihan', 'pemulihan', 'recovery') THEN 'dalam_pemulihan'
  ELSE 'sakit'
END;
UPDATE `kesehatan_burung` SET `symptoms` = '' WHERE `symptoms` IS NULL;
ALTER TABLE `kesehatan_burung`
  CHANGE COLUMN `condition` `status_kesehatan` ENUM('sehat', 'sakit', 'dalam_pemulihan') NOT NULL DEFAULT 'sakit',
  CHANGE COLUMN `symptoms` `gejala` LONGTEXT NOT NULL,
  CHANGE COLUMN `examinationDate` `tanggal_periksa` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CHANGE COLUMN `createdAt` `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  ADD COLUMN `pelapor_id` INTEGER NULL,
  ADD COLUMN `dokter_id` INTEGER NULL,
  ADD COLUMN `diagnosa` LONGTEXT NULL,
  ADD COLUMN `tindakan_medis` LONGTEXT NULL,
  ADD COLUMN `rekomendasi_pakan` LONGTEXT NULL,
  ADD COLUMN `butuh_karantina` BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

UPDATE `Bird`
SET `statusHealth` = 'dalam_pemulihan'
WHERE LOWER(`statusHealth`) IN ('pemulihan', 'recovery');

ALTER TABLE `kesehatan_burung`
  ADD CONSTRAINT `kesehatan_burung_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `kesehatan_burung_pelapor_id_fkey` FOREIGN KEY (`pelapor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `kesehatan_burung_dokter_id_fkey` FOREIGN KEY (`dokter_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `FeedingSchedule`
  ADD COLUMN `catatan_medis` LONGTEXT NULL;

ALTER TABLE `BirdTransfer`
  ADD COLUMN `approval_status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'approved',
  ADD COLUMN `approved_by_id` INTEGER NULL,
  ADD COLUMN `approved_at` DATETIME(3) NULL,
  ADD COLUMN `is_quarantine` BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE `BirdTransfer`
  ADD CONSTRAINT `BirdTransfer_approved_by_id_fkey` FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

RENAME TABLE `FeedingSchedule` TO `feeding_schedule`;
RENAME TABLE `BirdTransfer` TO `perpindahan`;

CREATE TABLE `audit_trail` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `user_id` INTEGER NOT NULL,
  `role` ENUM('admin', 'keeper', 'dokter_hewan') NOT NULL,
  `modul` VARCHAR(50) NOT NULL,
  `aksi` ENUM('CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'LOGIN') NOT NULL,
  `record_id` INTEGER NULL,
  `detail_perubahan` LONGTEXT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `audit_trail_user_id_created_at_idx` (`user_id`, `created_at`),
  INDEX `audit_trail_modul_created_at_idx` (`modul`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `audit_trail_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `medical_reminders` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `birdId` INTEGER NOT NULL,
  `creator_id` INTEGER NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `details` LONGTEXT NULL,
  `due_at` DATETIME(3) NOT NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `medical_reminders_due_at_idx` (`due_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `medical_reminders_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `medical_reminders_creator_id_fkey` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
