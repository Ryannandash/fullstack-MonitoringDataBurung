ALTER TABLE `species`
  ADD COLUMN `key_trait` VARCHAR(64) NULL,
  ADD COLUMN `distribution_status` VARCHAR(64) NULL,
  ADD COLUMN `vegetation` LONGTEXT NULL,
  ADD COLUMN `is_protected` BOOLEAN NOT NULL DEFAULT false;
