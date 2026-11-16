ALTER TABLE `FeedInventoryItem`
    ADD COLUMN `maximumStock` DOUBLE NULL,
    ADD COLUMN `containerUnit` VARCHAR(191) NOT NULL DEFAULT 'container',
    ADD COLUMN `containerCapacityKg` DOUBLE NOT NULL DEFAULT 40;
