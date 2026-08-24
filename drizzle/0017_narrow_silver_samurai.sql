CREATE TABLE `zone_route_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fromZoneId` int NOT NULL,
	`toZoneId` int NOT NULL,
	`fixedPrice` int NOT NULL,
	`isActive` int NOT NULL DEFAULT 1,
	`updatedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zone_route_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `zone_route_prices_fromZoneId_toZoneId_unique` UNIQUE(`fromZoneId`,`toZoneId`)
);
--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `routeFromZoneName` varchar(100);--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `routeToZoneName` varchar(100);--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `routeFixedPrice` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `adminArchivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `adminArchivedByUserId` int;--> statement-breakpoint
ALTER TABLE `drivers` ADD `canAcceptOrders` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `canUpdateOrderStatus` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `canUseDriverChat` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `zone_route_prices` ADD CONSTRAINT `zone_route_prices_fromZoneId_service_zones_id_fk` FOREIGN KEY (`fromZoneId`) REFERENCES `service_zones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zone_route_prices` ADD CONSTRAINT `zone_route_prices_toZoneId_service_zones_id_fk` FOREIGN KEY (`toZoneId`) REFERENCES `service_zones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zone_route_prices` ADD CONSTRAINT `zone_route_prices_updatedByUserId_users_id_fk` FOREIGN KEY (`updatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_adminArchivedByUserId_users_id_fk` FOREIGN KEY (`adminArchivedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;