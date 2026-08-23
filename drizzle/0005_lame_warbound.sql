CREATE TABLE `driver_order_invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`driverId` int NOT NULL,
	`status` enum('pending','accepted','rejected','expired','cancelled') NOT NULL DEFAULT 'pending',
	`distanceMeters` int NOT NULL DEFAULT 0,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	`respondedAt` timestamp,
	CONSTRAINT `driver_order_invitations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `driver_order_invitations` ADD CONSTRAINT `driver_order_invitations_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_order_invitations` ADD CONSTRAINT `driver_order_invitations_driverId_drivers_id_fk` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;