import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, AlertTriangle, Package } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface StockItem {
  id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  product_sku: string;
  color: string | null;
  size: string | null;
  quantity: number;
  min_quantity: number;
  category_name: string | null;
}

const StockLevels = () => {
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  useEffect(() => {
    loadStockLevels();
  }, []);

  const loadStockLevels = async () => {
    try {
      setLoading(true);
      
      // Load products without variants
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          categories (name)
        `);

      if (productsError) throw productsError;

      // Load variants with stock
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          id,
          product_id,
          color,
          size,
          quantity,
          min_quantity,
          products (name, sku, categories (name))
        `);

      if (variantsError) throw variantsError;

      // Combine into stock items
      const items: StockItem[] = [];

      // Add variants
      if (variants) {
        variants.forEach((variant: any) => {
          items.push({
            id: variant.id,
            product_id: variant.product_id,
            variant_id: variant.id,
            product_name: variant.products?.name || 'Unknown',
            product_sku: variant.products?.sku || 'N/A',
            color: variant.color,
            size: variant.size,
            quantity: variant.quantity,
            min_quantity: variant.min_quantity,
            category_name: variant.products?.categories?.name || null,
          });
        });
      }

      setStockItems(items);
    } catch (error) {
      console.error('Error loading stock levels:', error);
      toast.error('Failed to load stock levels');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = stockItems.filter((item) => {
    const matchesSearch = 
      item.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.size?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesLowStock = !filterLowStock || item.quantity <= item.min_quantity;

    return matchesSearch && matchesLowStock;
  });

  const getStockStatus = (quantity: number, minQuantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (quantity <= minQuantity) return { label: 'Low Stock', variant: 'default' as const };
    return { label: 'In Stock', variant: 'secondary' as const };
  };

  const lowStockCount = stockItems.filter(item => item.quantity <= item.min_quantity).length;
  const outOfStockCount = stockItems.filter(item => item.quantity === 0).length;
  const totalValue = stockItems.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading stock levels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{totalValue}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold">{lowStockCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-destructive/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold">{outOfStockCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products, SKU, color, size..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={filterLowStock}
              onChange={(e) => setFilterLowStock(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-sm">Show Low Stock Only</span>
          </label>
        </div>
      </Card>

      {/* Stock Table */}
      <Card className="p-4 md:p-6">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No stock items found</p>
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const status = getStockStatus(item.quantity, item.min_quantity);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">{item.product_sku}</Badge>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {item.color || item.size ? (
                          <div className="flex gap-1">
                            {item.color && <Badge variant="secondary">{item.color}</Badge>}
                            {item.size && <Badge variant="secondary">{item.size}</Badge>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Standard</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                      <TableCell className="text-right text-muted-foreground hidden sm:table-cell">
                        {item.min_quantity}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StockLevels;
