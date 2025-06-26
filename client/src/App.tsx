
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { Item, CreateItemInput, UpdateItemInput } from '../../server/src/schema';
import { ItemForm } from '@/components/ItemForm'; // Import the new component

function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<Item | null>(null);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getItems.query();
      setItems(result);
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleItemSubmit = async (data: CreateItemInput | UpdateItemInput) => {
    setIsLoading(true);
    try {
      // Type guard to distinguish between CreateItemInput and UpdateItemInput
      if ('id' in data && data.id !== undefined) {
        // It's an UpdateItemInput
        const updateData: UpdateItemInput = data;
        const updatedItem = await trpc.updateItem.mutate(updateData);
        setItems((prev: Item[]) =>
          prev.map((item: Item) => (item.id === updatedItem.id ? updatedItem : item))
        );
        setSelectedItemForEdit(null); // Clear selection after successful update
        setIsDialogOpen(false); // Close dialog
      } else {
        // It's a CreateItemInput. We assert the type here because ItemForm's state
        // ensures that when initialData is null, the submitted data matches CreateItemInput.
        const createData = data as CreateItemInput;
        const newItem = await trpc.createItem.mutate(createData);
        setItems((prev: Item[]) => [...prev, newItem]);
      }
    } catch (error) {
      console.error('Failed to process item:', error);
      alert(`Error processing item: ${error instanceof Error ? error.message : String(error)}`);
      throw error; // Re-throw to indicate failure to the form
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    setIsLoading(true);
    try {
      await trpc.deleteItem.mutate(itemId);
      setItems((prev: Item[]) => prev.filter((item: Item) => item.id !== itemId));
    } catch (error) {
      console.error('Failed to delete item:', error);
      alert(`Error deleting item: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (item: Item) => {
    setSelectedItemForEdit(item);
    setIsDialogOpen(true);
  };

  const closeEditDialog = () => {
    setSelectedItemForEdit(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-indigo-700">🛒 Inventory Tracker</h1>

      <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-indigo-600">Add New Item</h2>
        <ItemForm
          onSubmit={handleItemSubmit}
          isLoading={isLoading}
          submitButtonText="Create Item"
        />
      </div>

      <h2 className="text-2xl font-semibold mb-4 text-indigo-600">Current Inventory</h2>
      {isLoading && items.length === 0 ? (
        <p className="text-gray-500 text-center">Loading items...</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-center">No items yet. Add one above!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: Item) => (
            <div key={item.id} className="border p-5 rounded-lg shadow-sm bg-white hover:shadow-md transition-shadow duration-200">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{item.name}</h3>
              {item.description && (
                <p className="text-gray-600 text-sm mb-3 italic">{item.description}</p>
              )}
              <div className="flex justify-between items-center mt-3">
                <span className="text-lg font-semibold text-green-700">Quantity: {item.quantity}</span>
                <span className="text-xs text-gray-400">Created: {new Date(item.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex space-x-2 mt-4">
                <Button onClick={() => openEditDialog(item)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors duration-200">
                  Edit
                </Button>
                <Button onClick={() => handleDeleteItem(item.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors duration-200" disabled={isLoading}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Make changes to your item here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          {selectedItemForEdit && (
            <ItemForm
              onSubmit={handleItemSubmit}
              initialData={selectedItemForEdit}
              isLoading={isLoading}
              submitButtonText="Save Changes"
              onFormSuccess={closeEditDialog} // Close dialog on successful update
            />
          )}
          <DialogFooter>
            <Button onClick={closeEditDialog} className="bg-gray-200 text-gray-800 hover:bg-gray-300">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;
