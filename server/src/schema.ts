
import { z } from 'zod';

// Item schema for output/response
export const itemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(), // Drizzle text() is nullable by default
  quantity: z.number().int().nonnegative(), // Drizzle integer, non-negative
  created_at: z.coerce.date() // Drizzle timestamp
});

export type Item = z.infer<typeof itemSchema>;

// Input schema for creating items
export const createItemInputSchema = z.object({
  name: z.string().min(1, "Name cannot be empty"),
  description: z.string().nullable(), // Explicitly allow null
  quantity: z.number().int().nonnegative().default(0) // Non-negative integer, with a default for creation if not provided
});

export type CreateItemInput = z.infer<typeof createItemInputSchema>;

// Input schema for updating items
export const updateItemInputSchema = z.object({
  id: z.number().int().positive(), // Must be a positive integer ID
  name: z.string().min(1, "Name cannot be empty").optional(), // Optional, can be undefined if not changing name
  description: z.string().nullable().optional(), // Can be null or undefined
  quantity: z.number().int().nonnegative().optional() // Optional non-negative integer
});

export type UpdateItemInput = z.infer<typeof updateItemInputSchema>;
