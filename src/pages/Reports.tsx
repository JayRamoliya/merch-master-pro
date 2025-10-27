import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, TrendingUp } from 'lucide-react';

interface Stats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  todaySales: number;
}

const Reports = () => {
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    todaySales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Get total sales and revenue
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, created_at');

      if (salesError) throw salesError;

      // Get total products
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Calculate stats
      const totalSales = sales?.length || 0;
      const totalRevenue = sales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todaySales = sales?.filter(sale => 
        new Date(sale.created_at) >= today
      ).length || 0;

      setStats({
        totalSales,
        totalRevenue,
        totalProducts: productsCount || 0,
        todaySales,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description 
  }: { 
    title: string; 
    value: string | number; 
    icon: any; 
    description: string;
  }) => (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold mt-2">{value}</h3>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analytics and insights for your shop</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          description="All-time revenue"
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          icon={ShoppingCart}
          description="All-time transactions"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          icon={Package}
          description="Products in inventory"
        />
        <StatCard
          title="Today's Sales"
          value={stats.todaySales}
          icon={TrendingUp}
          description="Sales made today"
        />
      </div>

      <Card className="p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-semibold mb-4">Sales Overview</h2>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-4 bg-accent rounded-lg">
            <div>
              <p className="font-medium">Average Sale Value</p>
              <p className="text-sm text-muted-foreground">Per transaction</p>
            </div>
            <p className="text-xl sm:text-2xl font-bold">
              ₹{stats.totalSales > 0 ? (stats.totalRevenue / stats.totalSales).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
