import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Package, History, TrendingUp, Scan, AlertCircle } from 'lucide-react';
import StockLevels from '@/components/inventory/StockLevels';
import VariantManager from '@/components/inventory/VariantManager';
import StockAdjustment from '@/components/inventory/StockAdjustment';
import StockHistory from '@/components/inventory/StockHistory';
import BarcodeScanner from '@/components/inventory/BarcodeScanner';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('stock');

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage stock levels, variants, and inventory adjustments
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Stock Levels</span>
            <span className="sm:hidden">Stock</span>
          </TabsTrigger>
          <TabsTrigger value="variants" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Variants</span>
            <span className="sm:hidden">Variants</span>
          </TabsTrigger>
          <TabsTrigger value="adjust" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Adjustments</span>
            <span className="sm:hidden">Adjust</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger value="scanner" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            <span className="hidden sm:inline">Scanner</span>
            <span className="sm:hidden">Scan</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <StockLevels />
        </TabsContent>

        <TabsContent value="variants" className="space-y-4">
          <VariantManager />
        </TabsContent>

        <TabsContent value="adjust" className="space-y-4">
          <StockAdjustment />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <StockHistory />
        </TabsContent>

        <TabsContent value="scanner" className="space-y-4">
          <BarcodeScanner />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inventory;
