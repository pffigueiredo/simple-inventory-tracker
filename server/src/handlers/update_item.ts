
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type UpdateItemInput, type Item } from '../schema';
import { eq } from 'drizzle-orm';

export const updateItem = async (input: UpdateItemInput): Promise<Item> => {
  try {
    const { id, name, description, quantity } = input;

    // Construct the object with fields to update, only including those that are explicitly provided.
    // This ensures that undefined fields in the input do not nullify existing data.
    const updateFields: Partial<typeof itemsTable.$inferInsert> = {};

    if (name !== undefined) {
      updateFields.name = name;
    }
    // `description` can be explicitly set to `null`, so `null` is a valid update value.
    // We only skip if it's `undefined` (meaning no change requested for description).
    if (description !== undefined) {
      updateFields.description = description;
    }
    if (quantity !== undefined) {
      updateFields.quantity = quantity;
    }

    let updatedItem: Item | undefined;

    // If no fields are provided for update, simply fetch and return the existing item.
    // This prevents the "No values to set" error from Drizzle.
    if (Object.keys(updateFields).length === 0) {
      const existingItemResult = await db.select()
        .from(itemsTable)
        .where(eq(itemsTable.id, id))
        .execute();

      if (existingItemResult.length === 0) {
        throw new Error(`Item with ID ${id} not found.`);
      }
      updatedItem = existingItemResult[0];
    } else {
      // Fields are provided, perform the update operation
      const result = await db.update(itemsTable)
        .set(updateFields)
        .where(eq(itemsTable.id, id))
        .returning()
        .execute();

      // Check if any row was actually updated. If result is empty, the item was not found.
      if (result.length === 0) {
        throw new Error(`Item with ID ${id} not found.`);
      }
      updatedItem = result[0];
    }

    // Return the updated item, ensuring it conforms to the 'Item' type.
    // Drizzle returns `created_at` as a Date object by default for timestamp columns.
    // No specific numeric conversions are needed as the `itemsTable` schema does not use `numeric()` columns.
    return {
      id: updatedItem.id,
      name: updatedItem.name,
      description: updatedItem.description,
      quantity: updatedItem.quantity,
      created_at: updatedItem.created_at,
    };

  } catch (error) {
    console.error(`Item update failed for ID ${input.id}:`, error);
    // Rethrow the error to be handled by the caller (e.g., API route)
    throw error;
  }
};
