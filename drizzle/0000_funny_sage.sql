CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`preferences_json` text DEFAULT '{}' NOT NULL,
	`total_orders` integer DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customers_email_unique` ON `customers` (`email`);--> statement-breakpoint
CREATE TABLE `inventory_events` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`quantity_change` integer NOT NULL,
	`reason` text NOT NULL,
	`order_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`customer_name` text NOT NULL,
	`customer_email` text NOT NULL,
	`customer_phone` text NOT NULL,
	`city` text NOT NULL,
	`address` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`items_json` text NOT NULL,
	`subtotal` integer NOT NULL,
	`shipping` integer NOT NULL,
	`total` integer NOT NULL,
	`delivery_method` text NOT NULL,
	`payment_method` text NOT NULL,
	`payment_status` text DEFAULT 'pending' NOT NULL,
	`advance_amount` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`tracking_code` text,
	`whatsapp_notified` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_order_number_unique` ON `orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`order_id` text NOT NULL,
	`provider` text NOT NULL,
	`reference` text,
	`amount` integer NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`proof_url` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`verified_at` text
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`sku` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`collection` text DEFAULT 'Everyday' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`material` text DEFAULT '' NOT NULL,
	`price` integer NOT NULL,
	`compare_at` integer,
	`stock` integer DEFAULT 0 NOT NULL,
	`colors_json` text DEFAULT '[]' NOT NULL,
	`sizes_json` text DEFAULT '[]' NOT NULL,
	`images_json` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_sku_unique` ON `products` (`sku`);