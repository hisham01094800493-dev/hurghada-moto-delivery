CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`discountType` enum('fixed','percent') NOT NULL,
	`discountValue` int NOT NULL,
	`minimumOrderFee` int NOT NULL DEFAULT 0,
	`maximumDiscount` int,
	`maxRedemptions` int,
	`usedCount` int NOT NULL DEFAULT 0,
	`status` enum('active','paused','expired') NOT NULL DEFAULT 'active',
	`startsAt` timestamp,
	`endsAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `fareBeforeDiscount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `couponCode` varchar(40);--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `couponDiscount` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;