ALTER TABLE `delivery_orders` ADD `trackingShareToken` varchar(64);--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD `trackingShareEnabled` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `delivery_orders` ADD CONSTRAINT `delivery_orders_trackingShareToken_unique` UNIQUE(`trackingShareToken`);