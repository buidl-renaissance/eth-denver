CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`renaissanceId` text,
	`phone` text,
	`email` text,
	`username` text,
	`name` text,
	`pfpUrl` text,
	`displayName` text,
	`profilePicture` text,
	`accountAddress` text,
	`pinHash` text,
	`failedPinAttempts` integer DEFAULT 0,
	`lockedAt` integer,
	`status` text DEFAULT 'active',
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_renaissanceId_unique` ON `users` (`renaissanceId`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phone_unique` ON `users` (`phone`);