-- CreateTable
CREATE TABLE `Dome` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `region` VARCHAR(191) NULL,
    `areaSize` DOUBLE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Habitat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `domeId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `vegetationType` VARCHAR(191) NULL,
    `areaSize` DOUBLE NULL,
    `description` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Species` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `scientificName` VARCHAR(191) NOT NULL,
    `localName` VARCHAR(191) NOT NULL,
    `conservationStatus` VARCHAR(191) NULL,
    `dietType` VARCHAR(191) NULL,
    `avgLifespan` DOUBLE NULL,
    `description` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bird` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `speciesId` INTEGER NOT NULL,
    `habitatId` INTEGER NOT NULL,
    `ringNumber` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `birthDate` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `statusHealth` VARCHAR(191) NULL,
    `uniqueMark` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Bird_ringNumber_key`(`ringNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `birdId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `activityType` VARCHAR(191) NOT NULL,
    `activityTime` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NULL,
    `photoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedingSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `birdId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `feedingTime` VARCHAR(191) NOT NULL,
    `feedType` VARCHAR(191) NOT NULL,
    `amountKg` DOUBLE NULL,
    `frequency` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BreedingRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `birdId` INTEGER NOT NULL,
    `matingDate` DATETIME(3) NULL,
    `eggLayingDate` DATETIME(3) NULL,
    `eggCount` INTEGER NULL,
    `hatchingDate` DATETIME(3) NULL,
    `chickCount` INTEGER NULL,
    `status` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `fullName` VARCHAR(191) NULL,
    `profileUrl` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `User_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `HealthRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `birdId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `condition` VARCHAR(191) NOT NULL,
    `symptoms` LONGTEXT NULL,
    `veterinarian` VARCHAR(191) NULL,
    `examinationDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `treatment` LONGTEXT NULL,
    `nextCheckup` DATETIME(3) NULL,
    `photoUrl` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HealthRecord_birdId_examinationDate_idx`(`birdId`, `examinationDate`),
    INDEX `HealthRecord_nextCheckup_idx`(`nextCheckup`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BirdTransfer` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `birdId` INTEGER NOT NULL,
    `fromHabitatId` INTEGER NOT NULL,
    `toHabitatId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `movedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reason` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `BirdTransfer_birdId_movedAt_idx`(`birdId`, `movedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedInventoryItem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'kg',
    `currentStock` DOUBLE NOT NULL DEFAULT 0,
    `minimumStock` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `FeedInventoryItem_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedStockMovement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `inventoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `change` DOUBLE NOT NULL,
    `note` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedStockMovement_inventoryId_createdAt_idx`(`inventoryId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaDocument` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `birdId` INTEGER NULL,
    `userId` INTEGER NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `description` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MediaDocument_birdId_category_idx`(`birdId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `entity` VARCHAR(191) NOT NULL,
    `entityId` INTEGER NULL,
    `path` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_entity_entityId_createdAt_idx`(`entity`, `entityId`, `createdAt`),
    INDEX `AuditLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Habitat` ADD CONSTRAINT `Habitat_domeId_fkey` FOREIGN KEY (`domeId`) REFERENCES `Dome`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bird` ADD CONSTRAINT `Bird_speciesId_fkey` FOREIGN KEY (`speciesId`) REFERENCES `Species`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bird` ADD CONSTRAINT `Bird_habitatId_fkey` FOREIGN KEY (`habitatId`) REFERENCES `Habitat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActivityLog` ADD CONSTRAINT `ActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedingSchedule` ADD CONSTRAINT `FeedingSchedule_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedingSchedule` ADD CONSTRAINT `FeedingSchedule_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BreedingRecord` ADD CONSTRAINT `BreedingRecord_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthRecord` ADD CONSTRAINT `HealthRecord_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HealthRecord` ADD CONSTRAINT `HealthRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BirdTransfer` ADD CONSTRAINT `BirdTransfer_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BirdTransfer` ADD CONSTRAINT `BirdTransfer_fromHabitatId_fkey` FOREIGN KEY (`fromHabitatId`) REFERENCES `Habitat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BirdTransfer` ADD CONSTRAINT `BirdTransfer_toHabitatId_fkey` FOREIGN KEY (`toHabitatId`) REFERENCES `Habitat`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BirdTransfer` ADD CONSTRAINT `BirdTransfer_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedStockMovement` ADD CONSTRAINT `FeedStockMovement_inventoryId_fkey` FOREIGN KEY (`inventoryId`) REFERENCES `FeedInventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedStockMovement` ADD CONSTRAINT `FeedStockMovement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaDocument` ADD CONSTRAINT `MediaDocument_birdId_fkey` FOREIGN KEY (`birdId`) REFERENCES `Bird`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaDocument` ADD CONSTRAINT `MediaDocument_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

