
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { deleteItem } from '../handlers/delete_item';
import { eq } from 'drizzle-orm';

describe('deleteItem', () => {
  beforeEach(createDB); // Recreates the database schema for each test
  afterEach(resetDB); // Drops the database schema after each test

  it('should delete an existing item successfully', async () => {
    // 1. Arrange: Create an item to ensure it exists before deletion
    const testItemInput: CreateItemInput = {
      name: `Delete Test Item ${Date.now()}`, // Use Date.now() for unique names due to unique constraint
      description: 'This item is specifically for testing deletion.',
      quantity: 15
    };

    // Insert the item into the database
    const insertedItems = await db.insert(itemsTable)
      .values(testItemInput)
      .returning({ id: itemsTable.id, name: itemsTable.name })
      .execute();

    const itemIdToDelete = insertedItems[0].id;
    expect(itemIdToDelete).toBeDefined();

    // 2. Act: Call the deleteItem handler with the ID of the created item
    await deleteItem(itemIdToDelete);

    // 3. Assert: Verify the item no longer exists in the database
    const itemAfterDeletion = await db.select()
      .from(itemsTable)
      .where(eq(itemsTable.id, itemIdToDelete))
      .execute();

    expect(itemAfterDeletion).toHaveLength(0); // Expect no records found
  });

  it('should complete successfully when deleting a non-existent item', async () => {
    const nonExistentId = 99999; // A high ID unlikely to exist in an empty database

    // Arrange: Ensure no items are in the database (handled by beforeEach, but good to confirm)
    const initialItems = await db.select().from(itemsTable).execute();
    expect(initialItems).toHaveLength(0);

    // Act: Attempt to delete a non-existent item.
    // The operation should not throw an error, as deleting zero rows is not an error in SQL.
    await expect(deleteItem(nonExistentId)).resolves.toBeUndefined(); // Expect it to resolve without any return value

    // Assert: Verify that the database state remains unchanged (still empty)
    const itemsAfterAttempt = await db.select().from(itemsTable).execute();
    expect(itemsAfterAttempt).toHaveLength(0);
  });

  it('should only delete the specified item and leave others untouched', async () => {
    // Arrange: Create multiple items
    const item1Input: CreateItemInput = { name: `Keep Item A ${Date.now()}-1`, description: 'This item should remain', quantity: 1 };
    const item2Input: CreateItemInput = { name: `Delete Item B ${Date.now()}-2`, description: 'This item should be deleted', quantity: 2 };
    const item3Input: CreateItemInput = { name: `Keep Item C ${Date.now()}-3`, description: 'This item should also remain', quantity: 3 };

    const inserted1 = await db.insert(itemsTable).values(item1Input).returning().execute();
    const inserted2 = await db.insert(itemsTable).values(item2Input).returning().execute();
    const inserted3 = await db.insert(itemsTable).values(item3Input).returning().execute();

    const idToKeep1 = inserted1[0].id;
    const idToDelete = inserted2[0].id;
    const idToKeep2 = inserted3[0].id;

    // Verify all 3 items exist initially
    let allItemsBefore = await db.select().from(itemsTable).execute();
    expect(allItemsBefore).toHaveLength(3);
    expect(allItemsBefore.map(item => item.id)).toEqual(expect.arrayContaining([idToKeep1, idToDelete, idToKeep2]));

    // Act: Delete only the second item
    await deleteItem(idToDelete);

    // Assert: Verify the count is now 2 and the correct items remain
    let allItemsAfter = await db.select().from(itemsTable).orderBy(itemsTable.id).execute(); // Order for consistent checking

    expect(allItemsAfter).toHaveLength(2); // Only two items should remain

    // Verify that the kept items are still present
    expect(allItemsAfter.some(item => item.id === idToKeep1)).toBeTrue();
    expect(allItemsAfter.some(item => item.id === idToKeep2)).toBeTrue();

    // Verify that the deleted item is no longer present
    expect(allItemsAfter.some(item => item.id === idToDelete)).toBeFalse();
  });
});
