import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface Variant {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  quantity: number;
}

const StockAdjustment = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('');
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadVariants(selectedProduct);
    } else {
      setVariants([]);
      setSelectedVariant('');
      setCurrentStock(null);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (selectedVariant) {
      loadCurrentStock(selectedVariant);
    } else {
      setCurrentStock(null);
    }
  }, [selectedVariant]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const loadVariants = async (productId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, color, size, quantity')
        .eq('product_id', productId);

      if (error) throw error;
      setVariants(data || []);
      
      if (data && data.length > 0) {
        setSelectedVariant(data[0].id);
      }
    } catch (error) {
      console.error('Error loading variants:', error);
      toast.error('Failed to load variants');
    }
  };

  const loadCurrentStock = async (variantId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('quantity')
        .eq('id', variantId)
        .single();

      if (error) throw error;
      setCurrentStock(data.quantity);
    } catch (error) {
      console.error('Error loading current stock:', error);
    }
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !selectedVariant || !quantity) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const adjustmentQty = parseInt(quantity);
      let newQuantity = currentStock || 0;

      switch (adjustmentType) {
        case 'add':
          newQuantity += adjustmentQty;
          break;
        case 'remove':
          newQuantity -= adjustmentQty;
          break;
        case 'set':
          newQuantity = adjustmentQty;
          break;
      }

      if (newQuantity < 0) {
        toast.error('Stock cannot be negative');
        return;
      }

      // Update variant quantity
      const { error: updateError } = await supabase
        .from('product_variants')
        .update({ quantity: newQuantity })
        .eq('id', selectedVariant);

      if (updateError) throw updateError;

      // Log the adjustment
      const { error: logError } = await supabase
        .from('stock_logs')
        .insert([{
          product_id: selectedProduct,
          variant_id: selectedVariant,
          type: adjustmentType === 'add' ? 'adjustment_in' : adjustmentType === 'remove' ? 'adjustment_out' : 'adjustment_set',
          quantity: adjustmentType === 'set' ? newQuantity : adjustmentQty,
          note: note || `Stock ${adjustmentType} via manual adjustment`,
          created_by: user.id,
        }]);

      if (logError) throw logError;

      toast.success('Stock adjusted successfully');
      setQuantity('');
      setNote('');
      loadCurrentStock(selectedVariant);
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error('Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProduct('');
    setSelectedVariant('');
    setQuantity('');
    setNote('');
    setAdjustmentType('add');
    setCurrentStock(null);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6">
        <h2 className="text-xl font-semibold mb-4">Adjust Stock Levels</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Add, remove, or set stock quantities with optional notes for tracking
        </p>

        <form onSubmit={handleAdjustment} className="space-y-6">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="product">Product</Label>
              <Select
                value={selectedProduct}
                onValueChange={setSelectedProduct}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {variants.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="variant">Variant</Label>
                <Select
                  value={selectedVariant}
                  onValueChange={setSelectedVariant}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {variants.map((variant) => (
                      <SelectItem key={variant.id} value={variant.id}>
                        {variant.color || variant.size ? (
                          <>
                            {variant.color && variant.color}
                            {variant.color && variant.size && ' / '}
                            {variant.size && variant.size}
                            {' '}(Stock: {variant.quantity})
                          </>
                        ) : (
                          `Standard (Stock: ${variant.quantity})`
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {currentStock !== null && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Current Stock</p>
                <p className="text-2xl font-bold">{currentStock}</p>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Adjustment Type</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={adjustmentType === 'add' ? 'default' : 'outline'}
                  onClick={() => setAdjustmentType('add')}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
                <Button
                  type="button"
                  variant={adjustmentType === 'remove' ? 'default' : 'outline'}
                  onClick={() => setAdjustmentType('remove')}
                  className="flex items-center gap-2"
                >
                  <Minus className="h-4 w-4" />
                  Remove
                </Button>
                <Button
                  type="button"
                  variant={adjustmentType === 'set' ? 'default' : 'outline'}
                  onClick={() => setAdjustmentType('set')}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Set
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="quantity">
                {adjustmentType === 'set' ? 'New Quantity' : 'Quantity'}
              </Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={adjustmentType === 'set' ? 'Enter new stock level' : 'Enter quantity'}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note (Optional)</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about this adjustment..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !selectedProduct}>
              {loading ? 'Adjusting...' : 'Apply Adjustment'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm}>
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default StockAdjustment;
