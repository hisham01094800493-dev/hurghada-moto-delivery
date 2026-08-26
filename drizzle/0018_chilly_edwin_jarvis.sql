CREATE TABLE `driver_wallet_topups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`merchantRefNum` varchar(64) NOT NULL,
	`fawryRefNo` varchar(64),
	`amount` int NOT NULL,
	`status` enum('pending','paid','expired','cancelled','failed') NOT NULL DEFAULT 'pending',
	`paymentMethod` varchar(32) NOT NULL DEFAULT 'PayAtFawry',
	`expiresAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_wallet_topups_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_wallet_topups_merchantRefNum_unique` UNIQUE(`merchantRefNum`),
	CONSTRAINT `driver_wallet_topups_fawryRefNo_unique` UNIQUE(`fawryRefNo`)
);
--> statement-breakpoint
CREATE TABLE `driver_wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`orderId` int,
	`topupId` int,
	`type` enum('trip_commission','wallet_topup','admin_adjustment') NOT NULL,
	`amount` int NOT NULL,
	`balanceAfter` int NOT NULL,
	`description` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `drivers` ADD `walletBalance` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `walletCreditLimit` int DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `driver_wallet_topups` ADD CONSTRAINT `driver_wallet_topups_driverId_drivers_id_fk` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_wallet_transactions` ADD CONSTRAINT `driver_wallet_transactions_driverId_drivers_id_fk` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_wallet_transactions` ADD CONSTRAINT `driver_wallet_transactions_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;