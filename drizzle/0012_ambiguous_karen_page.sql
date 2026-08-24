CREATE TABLE `delivery_stops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`sequence` int NOT NULL,
	`address` text NOT NULL,
	`latitude` double,
	`longitude` double,
	`recipientName` varchar(120),
	`recipientPhone` varchar(32),
	`notes` text,
	`status` enum('pending','delivered','skipped') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_stops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `shipmentCategory` enum('general','food','documents','fragile','medicine') DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `declaredValue` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `requiresSignature` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_stops` ADD CONSTRAINT `delivery_stops_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;