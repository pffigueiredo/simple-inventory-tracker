
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput, type Item } from '../schema';

export const createItem = async (input: CreateItemInput): Promise<Item> => {
  try {
    // Insert item record into the database
    // The 'quantity' field will use the value from input, which will have Zod's default(0) applied if not provided
    // in an upstream Zod parsing step (e.g., API route validation). In this handler, input.quantity is guaranteed to be a number.
    // The 'created_at' field has defaultNow() in the schema and will be set automatically by the database.
    const result = await db.insert(itemsTable)
      .values({
        name: input.name,
        description: input.description, // description can be string or null
        quantity: input.quantity,       // quantity is guaranteed to be a number
      })
      .returning() // Return all fields of the newly inserted row
      .execute();

    // Drizzle returns an array of inserted rows. We expect one row for a single insert.
    const newItem = result[0];

    // No numeric type conversions needed as 'quantity' is an integer, not a numeric/decimal type.
    // 'created_at' is already a Date object from Drizzle.
    return newItem;
  } catch (error: any) {
    // Log the error for debugging purposes.
    // This could be, for example, a unique constraint violation for the 'name' field.
    console.error('Item creation failed:', error);
    // Re-throw the error to be handled by the caller or higher-level error middleware.
    throw error;
  }
};
