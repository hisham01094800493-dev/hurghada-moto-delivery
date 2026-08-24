CREATE TABLE `driver_withdrawal_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
	`note` text,
	`adminNote` text,
	`reviewedByUserId` int,
	`reviewedAt` timestamp,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_withdrawal_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `driver_withdrawal_requests` ADD CONSTRAINT `driver_withdrawal_requests_driverId_drivers_id_fk` FOREIGN KEY (`driverId`) REFERENCES `drivers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_withdrawal_requests` ADD CONSTRAINT `driver_withdrawal_requests_reviewedByUserId_users_id_fk` FOREIGN KEY (`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;