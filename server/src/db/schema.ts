
import { serial, text, pgTable, timestamp, integer, unique } from 'drizzle-orm/pg-core';

export const itemsTable = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(), // Enforce uniqueness for item names
  description: text('description'), // Nullable by default
  quantity: integer('quantity').notNull().default(0), // Ensures non-negative integer values, with a default
  created_at: timestamp('created_at').defaultNow().notNull(), // Automatically set creation timestamp
});

// TypeScript type for the table schema
export type Item = typeof itemsTable.$inferSelect; // For SELECT operations
export type NewItem = typeof itemsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { items: itemsTable };
