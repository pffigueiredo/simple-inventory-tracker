
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
// Note the extra ../ because we're in components subfolder relative to client/src/App.tsx
import type { Item, CreateItemInput, UpdateItemInput } from '../../../server/src/schema';

interface ItemFormProps {
  onSubmit: (data: CreateItemInput | UpdateItemInput) => Promise<void>;
  initialData?: Item | null;
  isLoading?: boolean;
  submitButtonText: string;
  onFormSuccess?: () => void; // Callback to notify parent on successful submission
}

export function ItemForm({ onSubmit, initialData = null, isLoading = false, submitButtonText, onFormSuccess }: ItemFormProps) {
  const [formData, setFormData] = useState<CreateItemInput | UpdateItemInput>(
    initialData
      ? { id: initialData.id, name: initialData.name, description: initialData.description, quantity: initialData.quantity }
      : { name: '', description: null, quantity: 0 }
  );

  // Effect to update form data when initialData changes (for edit dialog)
  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        description: initialData.description,
        quantity: initialData.quantity
      });
    } else {
      setFormData({ name: '', description: null, quantity: 0 });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(formData);
      // Reset form only if creating new item and submission was successful
      if (!initialData) {
        setFormData({ name: '', description: null, quantity: 0 });
      }
      onFormSuccess?.(); // Call success callback
    } catch (error) {
      console.error("Form submission failed:", error);
      // The error is already handled by the parent component (App.tsx)
      // No need to re-throw here unless specific form-level error display is needed
    }
  };

  const isUpdate = !!initialData;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name field: Read-only for update, required for create */}
      <Input
        placeholder="Item name"
        value={formData.name || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateItemInput | UpdateItemInput) => ({ ...prev, name: e.target.value }))
        }
        required={!isUpdate}
        disabled={isUpdate} // Name should not be editable during an update operation
        className={isUpdate ? "bg-gray-100 cursor-not-allowed" : ""}
      />
      <Input
        placeholder="Description (optional)"
        value={formData.description || ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateItemInput | UpdateItemInput) => ({
            ...prev,
            description: e.target.value || null // Convert empty string back to null
          }))
        }
      />
      <Input
        type="number"
        placeholder="Quantity"
        value={formData.quantity}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setFormData((prev: CreateItemInput | UpdateItemInput) => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))
        }
        min="0"
        required
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Processing...' : submitButtonText}
      </Button>
    </form>
  );
}
