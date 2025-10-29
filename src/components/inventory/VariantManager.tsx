import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
  min_quantity: number;
  products?: { name: string; sku: string };
}

const VariantManager = () => {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  
  const [formData, setFormData] = useState({
    product_id: '',
    color: '',
    size: '',
    quantity: '0',
    min_quantity: '5',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [variantsRes, productsRes] = await Promise.all([
        supabase
          .from('product_variants')
          .select('*, products (name, sku)')
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id, name, sku')
          .order('name'),
      ]);

      if (variantsRes.error) throw variantsRes.error;
      if (productsRes.error) throw productsRes.error;

      setVariants(variantsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load variants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const variantData = {
        product_id: formData.product_id,
        color: formData.color || null,
        size: formData.size || null,
        quantity: parseInt(formData.quantity),
        min_quantity: parseInt(formData.min_quantity),
      };

      if (editingVariant) {
        const { error } = await supabase
          .from('product_variants')
          .update(variantData)
          .eq('id', editingVariant.id);

        if (error) throw error;
        toast.success('Variant updated successfully');
      } else {
        const { error } = await supabase
          .from('product_variants')
          .insert([variantData]);

        if (error) throw error;
        toast.success('Variant added successfully');
      }

      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving variant:', error);
      toast.error('Failed to save variant');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variant?')) return;

    try {
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Variant deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting variant:', error);
      toast.error('Failed to delete variant');
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      color: '',
      size: '',
      quantity: '0',
      min_quantity: '5',
    });
    setEditingVariant(null);
  };

  const openEditDialog = (variant: Variant) => {
    setEditingVariant(variant);
    setFormData({
      product_id: variant.product_id,
      color: variant.color || '',
      size: variant.size || '',
      quantity: variant.quantity.toString(),
      min_quantity: variant.min_quantity.toString(),
    });
    setDialogOpen(true);
  };

  const filteredVariants = variants.filter(
    (variant) =>
      variant.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.products?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variant.size?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading variants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Manage product variants with different colors, sizes, and stock levels
        </p>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Variant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editingVariant ? 'Edit Variant' : 'Add New Variant'}</DialogTitle>
                <DialogDescription>
                  Create different variants for products with colors and sizes
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="product">Product</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="e.g., Red, Blue"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      placeholder="e.g., S, M, L"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="min_quantity">Min Quantity</Label>
                    <Input
                      id="min_quantity"
                      type="number"
                      min="0"
                      value={formData.min_quantity}
                      onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingVariant ? 'Update Variant' : 'Add Variant'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search variants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        {filteredVariants.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No variants found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden md:table-cell">Variant</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Min Qty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVariants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{variant.products?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{variant.products?.sku}</Badge>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1">
                        {variant.color && <Badge variant="secondary">{variant.color}</Badge>}
                        {variant.size && <Badge variant="secondary">{variant.size}</Badge>}
                        {!variant.color && !variant.size && (
                          <span className="text-muted-foreground text-sm">Standard</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">{variant.quantity}</TableCell>
                    <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                      {variant.min_quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(variant)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(variant.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default VariantManager;
