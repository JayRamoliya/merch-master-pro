import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Package, ShoppingCart, Users, AlertCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Stats {
  totalSales: number;
  totalRevenue: number;
  totalProducts: number;
  todaySales: number;
  totalExpenses: number;
  profit: number;
}

interface TopCustomer {
  name: string;
  totalSpent: number;
  purchases: number;
}

interface MonthlyData {
  month: string;
  sales: number;
  expenses: number;
}

interface ExpenseByCategory {
  category: string;
  amount: number;
}

export default function Reports() {
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    todaySales: 0,
    totalExpenses: 0,
    profit: 0,
  });
  const [loading, setLoading] = useState(true);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseByCategory[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Fetch sales data
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('total_amount, created_at, customer_id');

      if (salesError) throw salesError;

      // Fetch expenses data
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, category, date');

      if (expensesError) throw expensesError;

      // Fetch products count
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Fetch customers with their sales
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, name');

      if (customersError) throw customersError;

      const totalRevenue = sales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalExpenses = expenses?.reduce((sum, expense) => sum + Number(expense.amount), 0) || 0;
      const profit = totalRevenue - totalExpenses;
      
      const today = new Date().toDateString();
      const todaySales = sales?.filter(sale => new Date(sale.created_at).toDateString() === today).length || 0;

      setStats({
        totalSales: sales?.length || 0,
        totalRevenue,
        totalProducts: productsCount || 0,
        todaySales,
        totalExpenses,
        profit,
      });

      // Calculate top 5 customers
      const customerStats = customers?.map(customer => {
        const customerSales = sales?.filter(s => s.customer_id === customer.id) || [];
        return {
          name: customer.name,
          totalSpent: customerSales.reduce((sum, s) => sum + Number(s.total_amount), 0),
          purchases: customerSales.length,
        };
      }).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5) || [];
      
      setTopCustomers(customerStats);

      // Monthly sales vs expenses (last 6 months)
      const monthlyStats: Record<string, { sales: number; expenses: number }> = {};
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      sales?.forEach(sale => {
        const date = new Date(sale.created_at);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { sales: 0, expenses: 0 };
        monthlyStats[monthKey].sales += Number(sale.total_amount);
      });

      expenses?.forEach(expense => {
        const date = new Date(expense.date);
        const monthKey = `${months[date.getMonth()]} ${date.getFullYear()}`;
        if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { sales: 0, expenses: 0 };
        monthlyStats[monthKey].expenses += Number(expense.amount);
      });

      const monthlyDataArray = Object.entries(monthlyStats).map(([month, data]) => ({
        month,
        ...data,
      })).slice(-6);

      setMonthlyData(monthlyDataArray);

      // Expenses by category
      const categoryStats: Record<string, number> = {};
      expenses?.forEach(expense => {
        if (!categoryStats[expense.category]) categoryStats[expense.category] = 0;
        categoryStats[expense.category] += Number(expense.amount);
      });

      const expensesArray = Object.entries(categoryStats).map(([category, amount]) => ({
        category,
        amount,
      }));

      setExpensesByCategory(expensesArray);
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-muted-foreground">Comprehensive overview of your business performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          icon={DollarSign}
          description="Total sales amount"
        />
        <StatCard
          title="Total Expenses"
          value={`$${stats.totalExpenses.toFixed(2)}`}
          icon={AlertCircle}
          description="All business expenses"
        />
        <StatCard
          title="Profit"
          value={`$${stats.profit.toFixed(2)}`}
          icon={TrendingUp}
          description="Revenue - Expenses"
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSales.toString()}
          icon={ShoppingCart}
          description="Number of transactions"
        />
        <StatCard
          title="Total Products"
          value={stats.totalProducts.toString()}
          icon={Package}
          description="Products in inventory"
        />
        <StatCard
          title="Today's Sales"
          value={stats.todaySales.toString()}
          icon={TrendingUp}
          description="Sales made today"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {topCustomers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No customer data yet</p>
            ) : (
              <div className="space-y-4">
                {topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.purchases} purchases</p>
                      </div>
                    </div>
                    <p className="font-bold">${customer.totalSpent.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No expense data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {expensesByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Sales vs Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {monthlyData.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No monthly data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sales" fill="#0088FE" name="Sales" />
                <Bar dataKey="expenses" fill="#FF8042" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}