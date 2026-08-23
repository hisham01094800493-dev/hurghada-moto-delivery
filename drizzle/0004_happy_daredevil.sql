ALTER TABLE `delivery_orders` ADD `paymentMethod` enum('cash','vodafone_cash') DEFAULT 'cash' NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `paymentStatus` enum('pending','verifying','paid','failed') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `paymentReference` varchar(64);--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `paymentReceiptUrl` text;