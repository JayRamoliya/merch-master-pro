import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

interface Category {
  id: string;
  name: string;
}

interface BulkEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  categories: Category[];
  onSuccess: () => void;
}

const bulkEditSchema = z.object({
  price: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0;
  }, { message: "Price must be a valid positive number" }),
  priceAdjustment: z.string().optional().refine((val) => {
    if (!val || val === '') return true;
    const num = parseFloat(val);
    return !isNaN(num);
  }, { message: "Price adjustment must be a valid number" }),
  category_id: z.string().optional(),
});

const BulkEditDialog = ({ isOpen, onClose, selectedIds, categories, onSuccess }: BulkEditDialogProps) => {
  const [editType, setEditType] = useState<'set' | 'adjust'>('set');
  const [formData, setFormData] = useState({
    price: '',
    priceAdjustment: '',
    priceAdjustmentType: 'amount' as 'amount' | 'percentage',
    category_id: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedIds.length === 0) {
      toast.error('No products selected');
      return;
    }

    try {
      // Validate input
      const validation = bulkEditSchema.safeParse(formData);
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      const updates: any = {};

      // Handle category update
      if (formData.category_id) {
        updates.category_id = formData.category_id;
      }

      // Handle price updates
      if (editType === 'set' && formData.price) {
        const price = parseFloat(formData.price);
        if (price < 0) {
          toast.error('Price cannot be negative');
          return;
        }
        updates.price = price;

        // Simple update for set price
        const { error } = await supabase
          .from('products')
          .update(updates)
          .in('id', selectedIds);

        if (error) throw error;
      } else if (editType === 'adjust' && formData.priceAdjustment) {
        const adjustment = parseFloat(formData.priceAdjustment);
        
        // Fetch current products to calculate new prices
        const { data: products, error: fetchError } = await supabase
          .from('products')
          .select('id, price')
          .in('id', selectedIds);

        if (fetchError) throw fetchError;

        // Update each product individually with calculated price
        for (const product of products || []) {
          let newPrice: number;
          
          if (formData.priceAdjustmentType === 'percentage') {
            newPrice = product.price * (1 + adjustment / 100);
          } else {
            newPrice = product.price + adjustment;
          }

          // Ensure price doesn't go negative
          if (newPrice < 0) {
            toast.error(`Price adjustment would make some products negative`);
            return;
          }

          const updateData = { ...updates, price: Math.max(0, newPrice) };
          
          const { error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', product.id);

          if (error) throw error;
        }
      } else if (Object.keys(updates).length > 0) {
        // Only category update
        const { error } = await supabase
          .from('products')
          .update(updates)
          .in('id', selectedIds);

        if (error) throw error;
      } else {
        toast.error('No changes to apply');
        return;
      }

      toast.success(`Successfully updated ${selectedIds.length} product(s)`);
      resetForm();
      onClose();
      onSuccess();
    } catch (error) {
      console.error('Error bulk updating products:', error);
      toast.error('Failed to update products');
    }
  };

  const resetForm = () => {
    setFormData({
      price: '',
      priceAdjustment: '',
      priceAdjustmentType: 'amount',
      category_id: '',
    });
    setEditType('set');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Bulk Edit Products</DialogTitle>
            <DialogDescription>
              Update {selectedIds.length} selected product(s)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Price Update</Label>
              <Select value={editType} onValueChange={(value: 'set' | 'adjust') => setEditType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set Price</SelectItem>
                  <SelectItem value="adjust">Adjust Price</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editType === 'set' ? (
              <div className="grid gap-2">
                <Label htmlFor="price">New Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Leave empty to keep current prices"
                />
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="adjustment">Price Adjustment</Label>
                  <Input
                    id="adjustment"
                    type="number"
                    step="0.01"
                    value={formData.priceAdjustment}
                    onChange={(e) => setFormData({ ...formData, priceAdjustment: e.target.value })}
                    placeholder="Enter adjustment value"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Adjustment Type</Label>
                  <Select
                    value={formData.priceAdjustmentType}
                    onValueChange={(value: 'amount' | 'percentage') =>
                      setFormData({ ...formData, priceAdjustmentType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">Amount (₹)</SelectItem>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Leave empty to keep current category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit">
              Update {selectedIds.length} Product(s)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditDialog;