import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StockLog {
  id: string;
  product_id: string;
  variant_id: string | null;
  type: string;
  quantity: number;
  note: string | null;
  created_at: string;
  created_by: string | null;
  products?: { name: string; sku: string };
  product_variants?: { color: string | null; size: string | null };
}

const StockHistory = () => {
  const [logs, setLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadStockHistory();
  }, []);

  const loadStockHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_logs')
        .select(`
          *,
          products (name, sku),
          product_variants (color, size)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading stock history:', error);
      toast.error('Failed to load stock history');
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('in') || type === 'adjustment_in') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    if (type.includes('out') || type === 'adjustment_out') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <RefreshCw className="h-4 w-4 text-blue-500" />;
  };

  const getTypeBadge = (type: string) => {
    const typeMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
      'adjustment_in': { label: 'Stock In', variant: 'default' },
      'adjustment_out': { label: 'Stock Out', variant: 'destructive' },
      'adjustment_set': { label: 'Set Level', variant: 'secondary' },
      'sale': { label: 'Sale', variant: 'destructive' },
      'return': { label: 'Return', variant: 'default' },
      'purchase': { label: 'Purchase', variant: 'default' },
    };

    const typeInfo = typeMap[type] || { label: type, variant: 'secondary' as const };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      log.products?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.products?.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.note?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || log.type === filterType;

    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading stock history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by product, SKU, or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="adjustment_in">Stock In</SelectItem>
              <SelectItem value="adjustment_out">Stock Out</SelectItem>
              <SelectItem value="adjustment_set">Set Level</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="return">Return</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="p-4 md:p-6">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No stock history found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden md:table-cell">Variant</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="hidden lg:table-cell">Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {format(new Date(log.created_at), 'MMM dd, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{log.products?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{log.products?.sku}</Badge>
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {log.product_variants?.color || log.product_variants?.size ? (
                        <div className="flex gap-1">
                          {log.product_variants.color && (
                            <Badge variant="secondary" className="text-xs">{log.product_variants.color}</Badge>
                          )}
                          {log.product_variants.size && (
                            <Badge variant="secondary" className="text-xs">{log.product_variants.size}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Standard</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(log.type)}
                        {getTypeBadge(log.type)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      {log.type.includes('out') || log.type === 'sale' ? '-' : '+'}
                      {log.quantity}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-xs truncate">
                      {log.note || <span className="text-muted-foreground">-</span>}
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

export default StockHistory;
