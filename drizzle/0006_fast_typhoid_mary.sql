ALTER TABLE `chat_messages` ADD `messageType` enum('text','audio','location') DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `audioDurationSeconds` int;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `locationIsLive` int DEFAULT 0 NOT NULL;