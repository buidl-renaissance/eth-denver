CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`eventDate` text NOT NULL,
	`startTime` text NOT NULL,
	`endTime` text,
	`eventName` text NOT NULL,
	`organizer` text,
	`venue` text,
	`registrationUrl` text,
	`notes` text,
	`createdAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updatedAt` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `events_date_name_start` ON `events` (`eventDate`,`eventName`,`startTime`);