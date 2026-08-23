CREATE TABLE `drivers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`vehicleType` varchar(64) NOT NULL DEFAULT 'موتوسيكل',
	`vehiclePlate` varchar(32),
	`availability` enum('offline','online','busy','suspended') NOT NULL DEFAULT 'offline',
	`lastLatitude` double,
	`lastLongitude` double,
	`lastLocationAt` timestamp,
	`totalTrips` int NOT NULL DEFAULT 0,
	`totalEarnings` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drivers_id` PRIMARY KEY(`id`),
	CONSTRAINT `drivers_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`eventType` varchar(48) NOT NULL,
	`status` varchar(48) NOT NULL,
	`note` text,
	`actorUserId` int,
	`latitude` double,
	`longitude` double,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_addresses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(80) NOT NULL,
	`address` text NOT NULL,
	`latitude` double,
	`longitude` double,
	`isFavorite` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `saved_addresses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `delivery_orders` MODIFY COLUMN `serviceType` enum('person','parcel','documents','items','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` MODIFY COLUMN `status` enum('new','assigned','driver_arrived','picked_up','in_progress','in_delivery','delivered','cancelled') NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','driver','admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `driverId` int;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `pickupLatitude` double;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `pickupLongitude` double;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `destinationLatitude` double;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `destinationLongitude` double;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `arrivalNotes` text;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `packageSize` enum('small','medium','large') DEFAULT 'small';--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `itemCount` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `distanceMeters` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `estimatedMinutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `acceptedAt` timestamp;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `driverArrivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `pickedUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `deliveryStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `deliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `cancellationReason` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_events` ADD CONSTRAINT `order_events_actorUserId_users_id_fk` FOREIGN KEY (`actorUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_addresses` ADD CONSTRAINT `saved_addresses_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_driverId_drivers_id_fk` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;