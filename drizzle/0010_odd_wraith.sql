CREATE TABLE `delivery_complaints` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`category` enum('driver_behavior','delay','item_issue','payment','safety','other') NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','in_review','resolved','closed') NOT NULL DEFAULT 'open',
	`adminNote` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_complaints_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`customerUserId` int NOT NULL,
	`driverId` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `order_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `order_reviews_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
ALTER TABLE `delivery_complaints` ADD CONSTRAINT `delivery_complaints_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_complaints` ADD CONSTRAINT `delivery_complaints_customerUserId_users_id_fk` FOREIGN KEY (`customerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `delivery_complaints` ADD CONSTRAINT `delivery_complaints_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_reviews` ADD CONSTRAINT `order_reviews_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_reviews` ADD CONSTRAINT `order_reviews_customerUserId_users_id_fk` FOREIGN KEY (`customerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_reviews` ADD CONSTRAINT `order_reviews_driverId_drivers_id_fk` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;