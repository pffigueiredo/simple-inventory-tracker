
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput, type Item } from '../schema';
import { updateItem } from '../handlers/update_item';
import { eq } from 'drizzle-orm';

// Helper to create an item and return the full item object
const createTestItem = async (input: CreateItemInput): Promise<Item> => {
  const [item] = await db.insert(itemsTable).values(input).returning().execute();
  // Ensure the returned item matches the schema type, especially for date
  return {
    ...item,
    created_at: new Date(item.created_at) // Convert if it's not already a Date object (Drizzle usually handles this)
  };
};

describe('updateItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update all specified fields of an existing item', async () => {
    const originalItem = await createTestItem({
      name: 'Original Item',
      description: 'Original description of the item',
      quantity: 10
    });

    const updateInput = {
      id: originalItem.id,
      name: 'Updated Item Name',
      description: 'New description for the updated item',
      quantity: 20
    };

    const updatedItem = await updateItem(updateInput);

    // Assert the returned item matches the updated values
    expect(updatedItem.id).toBe(originalItem.id);
    expect(updatedItem.name).toBe(updateInput.name);
    expect(updatedItem.description).toBe(updateInput.description);
    expect(updatedItem.quantity).toBe(updateInput.quantity);
    // created_at should not change on update
    expect(updatedItem.created_at.getTime()).toEqual(originalItem.created_at.getTime());

    // Verify the changes in the database
    const [dbItem] = await db.select().from(itemsTable).where(eq(itemsTable.id, originalItem.id)).execute();
    expect(dbItem).toBeDefined();
    expect(dbItem.name).toBe(updateInput.name);
    expect(dbItem.description).toBe(updateInput.description);
    expect(dbItem.quantity).toBe(updateInput.quantity);
    expect(dbItem.created_at.getTime()).toEqual(originalItem.created_at.getTime());
  });

  it('should update only the name of an existing item', async () => {
    const originalItem = await createTestItem({
      name: 'Item to be Renamed',
      description: 'This is an item description.',
      quantity: 5
    });

    const updateInput = {
      id: originalItem.id,
      name: 'Renamed Item'
    };

    const updatedItem = await updateItem(updateInput);

    // Assert only name is updated, others remain unchanged
    expect(updatedItem.id).toBe(originalItem.id);
    expect(updatedItem.name).toBe(updateInput.name);
    expect(updatedItem.description).toBe(originalItem.description); // Should be unchanged
    expect(updatedItem.quantity).toBe(originalItem.quantity);     // Should be unchanged
    expect(updatedItem.created_at.getTime()).toEqual(originalItem.created_at.getTime());

    // Verify in database
    const [dbItem] = await db.select().from(itemsTable).where(eq(itemsTable.id, originalItem.id)).execute();
    expect(dbItem).toBeDefined();
    expect(dbItem.name).toBe(updateInput.name);
    expect(dbItem.description).toBe(originalItem.description);
    expect(dbItem.quantity).toBe(originalItem.quantity);
  });

  it('should update description to null', async () => {
    const originalItem = await createTestItem({
      name: 'Item with Description',
      description: 'A non-null description initially',
      quantity: 15
    });

    const updateInput = {
      id: originalItem.id,
      description: null
    };

    const updatedItem = await updateItem(updateInput);

    // Assert description is now null, others unchanged
    expect(updatedItem.id).toBe(originalItem.id);
    expect(updatedItem.description).toBeNull();
    expect(updatedItem.name).toBe(originalItem.name);       // Unchanged
    expect(updatedItem.quantity).toBe(originalItem.quantity); // Unchanged

    // Verify in database
    const [dbItem] = await db.select().from(itemsTable).where(eq(itemsTable.id, originalItem.id)).execute();
    expect(dbItem).toBeDefined();
    expect(dbItem.description).toBeNull();
  });

  it('should update only the quantity of an existing item', async () => {
    const originalItem = await createTestItem({
      name: 'Item for quantity update',
      description: 'Some valid description here',
      quantity: 50
    });

    const updateInput = {
      id: originalItem.id,
      quantity: 100
    };

    const updatedItem = await updateItem(updateInput);

    // Assert quantity is updated, others unchanged
    expect(updatedItem.id).toBe(originalItem.id);
    expect(updatedItem.quantity).toBe(updateInput.quantity);
    expect(updatedItem.name).toBe(originalItem.name);
    expect(updatedItem.description).toBe(originalItem.description);
    expect(updatedItem.created_at.getTime()).toEqual(originalItem.created_at.getTime());

    // Verify in database
    const [dbItem] = await db.select().from(itemsTable).where(eq(itemsTable.id, originalItem.id)).execute();
    expect(dbItem).toBeDefined();
    expect(dbItem.quantity).toBe(updateInput.quantity);
  });

  it('should throw an error if the item ID does not exist', async () => {
    const nonExistentId = 9999;
    const updateInput = {
      id: nonExistentId,
      name: 'Attempted Update'
    };

    // Expect the handler to reject with a specific error message
    await expect(updateItem(updateInput)).rejects.toThrow(`Item with ID ${nonExistentId} not found.`);
  });

  it('should throw an error on unique name constraint violation', async () => {
    // Corrected to include description
    await createTestItem({ name: 'Existing Item A', description: null, quantity: 10 });
    const itemToUpdate = await createTestItem({ name: 'Item To Be Updated', description: null, quantity: 20 });

    const updateInput = {
      id: itemToUpdate.id,
      name: 'Existing Item A' // This name already exists
    };

    // Expect the handler to reject due to unique constraint
    await expect(updateItem(updateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);

    // Ensure the original item's name was not changed in the database
    const [dbItem] = await db.select().from(itemsTable).where(eq(itemsTable.id, itemToUpdate.id)).execute();
    expect(dbItem.name).toBe('Item To Be Updated');
  });

  it('should not update any fields if no update fields (name, description, quantity) are provided in input', async () => {
    const originalItem = await createTestItem({
      name: 'No fields updated test',
      description: 'Initial description',
      quantity: 10
    });

    const updateInput = {
      id: originalItem.id,
      // No other fields provided, only ID
    };

    const updatedItem = await updateItem(updateInput);

    // Assert that the returned item is identical to the original
    expect(updatedItem.id).toBe(originalItem.id);
    expect(updatedItem.name).toBe(originalItem.name);
    expect(updatedItem.description).toBe(originalItem.description);
    expect(updatedItem.quantity).toBe(originalItem.quantity);
    expect(updatedItem.created_at.getTime()).toEqual(originalItem.created_at.getTime());

    // Verify the state in the database remains unchanged
    const [dbItem] = await db.select().from(itemsTable).where(eq(itemsTable.id, originalItem.id)).execute();
    expect(dbItem.name).toBe(originalItem.name);
    expect(dbItem.description).toBe(originalItem.description);
    expect(dbItem.quantity).toBe(originalItem.quantity);
  });
});
