CREATE TABLE `delivery_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reference` varchar(32) NOT NULL,
	`userId` int NOT NULL,
	`serviceType` enum('person','parcel') NOT NULL,
	`status` enum('new','in_progress','delivered') NOT NULL DEFAULT 'new',
	`customerName` varchar(120) NOT NULL,
	`customerPhone` varchar(32) NOT NULL,
	`pickupAddress` text NOT NULL,
	`destinationAddress` text NOT NULL,
	`requestedFor` timestamp NOT NULL,
	`recipientName` varchar(120),
	`recipientPhone` varchar(32),
	`packageDescription` text,
	`contactless` int NOT NULL DEFAULT 0,
	`healthNotes` text,
	`estimatedFee` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_orders_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;