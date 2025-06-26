
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type Item } from '../schema'; // Import Item type for type checking
import { getItemById } from '../handlers/get_item_by_id';
import { eq } from 'drizzle-orm';

describe('getItemById', () => {
  // Set up and tear down the database for each test to ensure isolation
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return an item if it exists in the database', async () => {
    // Arrange: Insert a test item directly into the database
    const testItemName = 'Exist Item';
    const testDescription = 'A description for an item that should exist.';
    const testQuantity = 123;

    // Use .returning() to get the inserted row, including its generated ID and created_at
    const insertedItems = await db.insert(itemsTable)
      .values({
        name: testItemName,
        description: testDescription,
        quantity: testQuantity,
      })
      .returning()
      .execute();

    // Ensure an item was actually inserted and retrieve its ID
    expect(insertedItems).toHaveLength(1);
    const insertedItem = insertedItems[0];
    expect(insertedItem.id).toBeDefined();

    // Act: Call the handler with the ID of the inserted item
    const foundItem = await getItemById(insertedItem.id);

    // Assert: Verify that the found item is not null and matches the inserted data
    expect(foundItem).not.toBeNull();
    expect(foundItem!.id).toEqual(insertedItem.id);
    expect(foundItem!.name).toEqual(testItemName);
    expect(foundItem!.description).toEqual(testDescription);
    expect(foundItem!.quantity).toEqual(testQuantity);
    expect(foundItem!.created_at).toBeInstanceOf(Date);

    // Further check if the retrieved date matches the database's date value
    // Allow for slight millisecond differences due to database precision or conversion
    expect(foundItem!.created_at.getTime()).toBeCloseTo(insertedItem.created_at.getTime(), -3);
  });

  it('should return null if the item does not exist in the database', async () => {
    // Arrange: Choose an ID that is highly unlikely to exist
    const nonExistentId = 999999;

    // Act: Call the handler with a non-existent ID
    const foundItem = await getItemById(nonExistentId);

    // Assert: Verify that the handler returns null
    expect(foundItem).toBeNull();
  });

  it('should return the item with correct data types as per schema', async () => {
    // Arrange: Insert an item to test type integrity, including a nullable field as null
    const insertedItems = await db.insert(itemsTable)
      .values({
        name: 'Type Check Item',
        description: null, // Test handling of null description
        quantity: 0, // Test handling of zero quantity
      })
      .returning()
      .execute();

    expect(insertedItems).toHaveLength(1);
    const insertedItem = insertedItems[0];

    // Act: Retrieve the item using the handler
    const foundItem = await getItemById(insertedItem.id);

    // Assert: Verify the returned object's structure and data types
    expect(foundItem).not.toBeNull();
    // Use type assertion to ensure stricter type checks on the 'foundItem'
    const item: Item = foundItem!;

    expect(typeof item.id).toBe('number');
    expect(item.id).toEqual(insertedItem.id); // Check value
    expect(typeof item.name).toBe('string');
    expect(item.name).toEqual('Type Check Item'); // Check value
    expect(item.description).toBeNull(); // Ensure null is preserved
    expect(typeof item.quantity).toBe('number');
    expect(Number.isInteger(item.quantity)).toBe(true); // Quantity should be an integer
    expect(item.quantity).toEqual(0); // Check value
    expect(item.created_at).toBeInstanceOf(Date); // Check Date object type
  });

  it('should handle items with empty string description (not null)', async () => {
    // Arrange: Insert an item with an empty string description
    const insertedItems = await db.insert(itemsTable)
      .values({
        name: 'Empty Desc Item',
        description: '', // Empty string, not null
        quantity: 5,
      })
      .returning()
      .execute();

    expect(insertedItems).toHaveLength(1);
    const insertedItem = insertedItems[0];

    // Act: Retrieve the item
    const foundItem = await getItemById(insertedItem.id);

    // Assert: Check that the description is an empty string, not null
    expect(foundItem).not.toBeNull();
    expect(foundItem!.description).toEqual('');
    expect(typeof foundItem!.description).toBe('string');
  });
});
