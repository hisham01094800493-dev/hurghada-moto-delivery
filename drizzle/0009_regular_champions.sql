CREATE TABLE `service_pricing_rules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`serviceType` enum('person','parcel','documents','items','other') NOT NULL,
	`baseFare` int NOT NULL,
	`perKmFare` int NOT NULL,
	`minimumFare` int NOT NULL,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_pricing_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_pricing_rules_serviceType_unique` UNIQUE(`serviceType`)
);
--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `platformCommissionAmount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `driverEarnings` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `commissionPercent` int DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE `service_pricing_rules` ADD CONSTRAINT `service_pricing_rules_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;