import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scan, Search, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  categories?: { name: string };
}

interface Variant {
  id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  quantity: number;
  min_quantity: number;
}

const BarcodeScanner = () => {
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);

  const handleSearch = async (searchSku: string) => {
    if (!searchSku.trim()) {
      setProduct(null);
      setVariants([]);
      return;
    }

    setLoading(true);
    try {
      // Search for product by SKU
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('*, categories (name)')
        .eq('sku', searchSku.toUpperCase())
        .single();

      if (productError) {
        if (productError.code === 'PGRST116') {
          toast.error('Product not found');
          setProduct(null);
          setVariants([]);
        } else {
          throw productError;
        }
        return;
      }

      setProduct(productData);

      // Load variants for this product
      const { data: variantsData, error: variantsError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productData.id);

      if (variantsError) throw variantsError;
      setVariants(variantsData || []);

      toast.success('Product found!');
    } catch (error) {
      console.error('Error searching product:', error);
      toast.error('Failed to search product');
      setProduct(null);
      setVariants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch(sku);
    }
  };

  const getStockStatus = (quantity: number, minQuantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', variant: 'destructive' as const };
    if (quantity <= minQuantity) return { label: 'Low Stock', variant: 'default' as const };
    return { label: 'In Stock', variant: 'secondary' as const };
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Scan className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Barcode / SKU Scanner</h2>
            <p className="text-sm text-muted-foreground">
              Enter or scan product SKU to view stock information
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="sku">Product SKU</Label>
            <div className="flex gap-2">
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter or scan SKU..."
                className="flex-1 font-mono"
                autoComplete="off"
                autoFocus
              />
              <Button 
                onClick={() => handleSearch(sku)} 
                disabled={loading || !sku.trim()}
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Focus on the input field and scan the barcode directly
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {!loading && product && (
            <div className="space-y-4 mt-6">
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        SKU: <Badge variant="outline">{product.sku}</Badge>
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-base">
                      ₹{product.price.toFixed(2)}
                    </Badge>
                  </div>
                  
                  {product.categories && (
                    <p className="text-sm">
                      Category: <Badge variant="outline">{product.categories.name}</Badge>
                    </p>
                  )}
                </div>
              </Card>

              {variants.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="font-semibold">Stock Levels by Variant</h4>
                  <div className="grid gap-2">
                    {variants.map((variant) => {
                      const status = getStockStatus(variant.quantity, variant.min_quantity);
                      return (
                        <Card key={variant.id} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                {variant.color && (
                                  <Badge variant="secondary">{variant.color}</Badge>
                                )}
                                {variant.size && (
                                  <Badge variant="secondary">{variant.size}</Badge>
                                )}
                                {!variant.color && !variant.size && (
                                  <span className="text-sm text-muted-foreground">Standard</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Stock:</span>
                                <span className="font-bold text-lg">{variant.quantity}</span>
                                <span className="text-muted-foreground">/ Min: {variant.min_quantity}</span>
                              </div>
                            </div>
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </div>
                          
                          {variant.quantity <= variant.min_quantity && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-yellow-600 dark:text-yellow-500">
                              <AlertCircle className="h-4 w-4" />
                              <span>Reorder recommended</span>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <Card className="p-4 border-dashed">
                  <p className="text-center text-muted-foreground">
                    No variants found for this product
                  </p>
                </Card>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default BarcodeScanner;
