CREATE TABLE `driver_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`documentType` enum('national_id','driver_license','vehicle_registration','selfie') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(160) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `driver_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shipment_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`uploaderUserId` int NOT NULL,
	`attachmentType` enum('shipment_photo','proof_of_delivery','other') NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(160) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `shipment_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `drivers` ADD `verificationStatus` enum('not_submitted','pending','approved','rejected') DEFAULT 'not_submitted' NOT NULL;--> statement-breakpoint
ALTER TABLE `drivers` ADD `verificationNote` text;--> statement-breakpoint
ALTER TABLE `drivers` ADD `verifiedByUserId` int;--> statement-breakpoint
ALTER TABLE `drivers` ADD `verifiedAt` timestamp;--> statement-breakpoint
ALTER TABLE `driver_documents` ADD CONSTRAINT `driver_documents_driverId_drivers_id_fk` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment_attachments` ADD CONSTRAINT `shipment_attachments_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `shipment_attachments` ADD CONSTRAINT `shipment_attachments_uploaderUserId_users_id_fk` FOREIGN KEY (`uploaderUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `drivers` ADD CONSTRAINT `drivers_verifiedByUserId_users_id_fk` FOREIGN KEY (`verifiedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;