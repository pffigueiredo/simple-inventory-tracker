
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteItem = async (id: number): Promise<void> => {
  try {
    // Delete item record by its ID.
    // Drizzle's delete operation for PostgreSQL returns an object
    // with 'rowCount' indicating how many rows were affected.
    const result = await db.delete(itemsTable)
      .where(eq(itemsTable.id, id))
      .execute();

    // Although the function returns Promise<void>,
    // it's good practice to log if no item was found for deletion,
    // as it might indicate an issue in the calling logic.
    if (result.rowCount === 0) {
      console.warn(`Delete operation for item ID ${id} completed, but no item was found.`);
    }
  } catch (error) {
    // Log the error with context and re-throw it
    console.error(`Failed to delete item with ID ${id}:`, error);
    throw error;
  }
};
