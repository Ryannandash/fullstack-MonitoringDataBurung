ALTER TABLE `species`
  ADD COLUMN `is_rare` BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE `breedingrecord`
  ADD COLUMN `mate_bird_id` INTEGER NULL,
  ADD INDEX `breedingrecord_mate_bird_id_idx` (`mate_bird_id`),
  ADD CONSTRAINT `breedingrecord_mate_bird_id_fkey`
    FOREIGN KEY (`mate_bird_id`) REFERENCES `bird`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;
