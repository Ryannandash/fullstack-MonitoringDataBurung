ALTER TABLE `medical_treatments`
  ADD COLUMN `bird_id` INTEGER NULL,
  ADD COLUMN `condition` VARCHAR(32) NULL,
  ADD COLUMN `symptoms` LONGTEXT NULL,
  ADD COLUMN `next_checkup` DATETIME(3) NULL;

UPDATE `medical_treatments` AS mt
JOIN `kesehatan_burung` AS hr ON hr.`id` = mt.`health_record_id`
SET mt.`bird_id` = hr.`birdId`,
    mt.`condition` = hr.`status_kesehatan`,
    mt.`symptoms` = hr.`gejala`,
    mt.`next_checkup` = hr.`nextCheckup`;

ALTER TABLE `medical_treatments`
  MODIFY COLUMN `health_record_id` INTEGER NULL,
  MODIFY COLUMN `bird_id` INTEGER NOT NULL,
  MODIFY COLUMN `condition` VARCHAR(32) NOT NULL,
  MODIFY COLUMN `symptoms` LONGTEXT NOT NULL,
  ADD INDEX `medical_treatments_bird_id_starts_at_idx` (`bird_id`, `starts_at`),
  ADD CONSTRAINT `medical_treatments_bird_id_fkey`
    FOREIGN KEY (`bird_id`) REFERENCES `bird`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE;

