CREATE TABLE `service_zones` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`centerLatitude` double NOT NULL,
	`centerLongitude` double NOT NULL,
	`radiusMeters` int NOT NULL,
	`surcharge` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_zones_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_zones_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `serviceZoneName` varchar(100);--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `zoneSurcharge` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `service_zones` ADD CONSTRAINT `service_zones_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;