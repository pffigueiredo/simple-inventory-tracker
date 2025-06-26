
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { itemsTable } from '../db/schema';
import { type CreateItemInput } from '../schema';
import { createItem } from '../handlers/create_item';
import { eq } from 'drizzle-orm';

describe('createItem', () => {
  // Set up and tear down the database for each test to ensure isolation
  beforeEach(createDB);
  afterEach(resetDB);

  // A common input for testing item creation
  const baseItemInput: CreateItemInput = {
    name: 'Test Item',
    description: 'A detailed description of the test item.',
    quantity: 50,
  };

  it('should create an item successfully with all provided fields', async () => {
    const result = await createItem(baseItemInput);

    // Assert that the returned item matches the input and has auto-generated fields
    expect(result).toBeDefined();
    expect(result.id).toBeNumber();
    expect(result.id).toBeGreaterThan(0); // ID should be a positive auto-incremented number
    expect(result.name).toEqual(baseItemInput.name);
    expect(result.description).toEqual(baseItemInput.description);
    expect(result.quantity).toEqual(baseItemInput.quantity);
    expect(result.created_at).toBeInstanceOf(Date); // created_at should be a Date object

    // Verify the item exists in the database
    const itemsInDb = await db.select().from(itemsTable).where(eq(itemsTable.id, result.id)).execute();
    expect(itemsInDb).toHaveLength(1);
    expect(itemsInDb[0].name).toEqual(baseItemInput.name);
    expect(itemsInDb[0].description).toEqual(baseItemInput.description);
    expect(itemsInDb[0].quantity).toEqual(baseItemInput.quantity);
    expect(itemsInDb[0].created_at).toBeInstanceOf(Date);
  });

  it('should create an item with a null description successfully', async () => {
    const inputWithNullDesc: CreateItemInput = {
      ...baseItemInput,
      name: 'Item With Null Desc', // Unique name
      description: null, // Explicitly set description to null
      quantity: 10, // Ensure quantity is provided as it's required by CreateItemInput
    };

    const result = await createItem(inputWithNullDesc);

    // Assert that description is null in the returned object
    expect(result.description).toBeNull();

    // Verify description is null in the database
    const itemsInDb = await db.select().from(itemsTable).where(eq(itemsTable.id, result.id)).execute();
    expect(itemsInDb[0].description).toBeNull();
  });

  // Re-framed test to correctly pass a quantity of 0, as the type requires 'quantity' to be present.
  it('should correctly save an item with a quantity of zero', async () => {
    // Create an input where quantity is explicitly set to 0.
    // The Zod default would apply if 'quantity' was optional in the schema and omitted from an API request.
    // In this direct function call, we must satisfy the CreateItemInput type.
    const inputWithZeroQuantity: CreateItemInput = {
      name: 'Item With Zero Qty', // Unique name
      description: 'This item has a quantity of zero.',
      quantity: 0, // Explicitly provide 0
    };

    const result = await createItem(inputWithZeroQuantity);

    // Assert that the quantity is 0
    expect(result.quantity).toEqual(0);

    // Verify the quantity in the database is 0
    const itemsInDb = await db.select().from(itemsTable).where(eq(itemsTable.id, result.id)).execute();
    expect(itemsInDb[0].quantity).toEqual(0);
  });

  it('should throw an error when attempting to create an item with a duplicate name', async () => {
    // First, create an item with a specific name
    await createItem(baseItemInput);

    // Attempt to create another item with the exact same name
    const duplicateNameInput: CreateItemInput = {
      ...baseItemInput, // Uses the same name as baseItemInput
      description: 'Different description for the duplicate.',
      quantity: 10,
    };

    // Expect the promise to reject because of the unique constraint on the 'name' column
    await expect(createItem(duplicateNameInput)).rejects.toThrow(
      /duplicate key value violates unique constraint/i // Case-insensitive match for the Postgres error message
    );
  });

  it('should handle item names with special characters correctly', async () => {
    const specialCharNameInput: CreateItemInput = {
      name: 'Item Name with !@#$%^&*()_+ special characters',
      description: null,
      quantity: 1,
    };

    const result = await createItem(specialCharNameInput);
    expect(result.name).toEqual(specialCharNameInput.name);

    const itemsInDb = await db.select().from(itemsTable).where(eq(itemsTable.id, result.id)).execute();
    expect(itemsInDb[0].name).toEqual(specialCharNameInput.name);
  });
});
