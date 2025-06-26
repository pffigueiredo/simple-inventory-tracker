
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type Item } from '../schema';
import { eq } from 'drizzle-orm';

export const getItemById = async (id: number): Promise<Item | null> => {
    try {
        // Select an item from the itemsTable where the id matches the input id.
        // We limit the result to 1 since 'id' is a primary key and unique.
        const result = await db.select()
            .from(itemsTable)
            .where(eq(itemsTable.id, id))
            .limit(1)
            .execute();

        // If no item is found (result array is empty), return null.
        if (result.length === 0) {
            return null;
        }

        // Return the first (and only) item found.
        // Drizzle automatically handles the conversion of integer/serial columns to numbers
        // and timestamp columns to Date objects, so no manual parseFloat/toString is needed here.
        return result[0];
    } catch (error) {
        // Log the error for debugging purposes and rethrow it to be handled by the caller.
        console.error(`Failed to retrieve item with ID ${id}:`, error);
        throw error;
    }
};
