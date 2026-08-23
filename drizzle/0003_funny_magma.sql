CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int,
	`senderUserId` int NOT NULL,
	`recipientUserId` int NOT NULL,
	`channel` enum('support','driver') NOT NULL DEFAULT 'support',
	`body` text,
	`locationLabel` varchar(240),
	`locationLatitude` double,
	`locationLongitude` double,
	`attachmentUrl` text,
	`attachmentName` varchar(255),
	`status` enum('sent','read') NOT NULL DEFAULT 'sent',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`orderId` int,
	`title` varchar(160) NOT NULL,
	`body` text NOT NULL,
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderUserId_users_id_fk` FOREIGN KEY (`senderUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_recipientUserId_users_id_fk` FOREIGN KEY (`recipientUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_orderId_delivery_orders_id_fk` FOREIGN KEY (`orderId`) REFERENCES `delivery_orders`(`id`) ON DELETE no action ON UPDATE no action;