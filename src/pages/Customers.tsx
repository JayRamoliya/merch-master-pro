import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
}

interface CustomerStats {
  totalPurchases: number;
  totalSpent: number;
  recentInvoices: any[];
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [customerStats, setCustomerStats] = useState<CustomerStats | null>(null);

  const form = useForm({
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      address: '',
    },
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (editingCustomer) {
      form.reset({
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        email: editingCustomer.email || '',
        address: editingCustomer.address || '',
      });
    } else {
      form.reset({
        name: '',
        phone: '',
        email: '',
        address: '',
      });
    }
  }, [editingCustomer, form]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({ title: 'Error loading customers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerStats = async (customerId: string) => {
    try {
      // Get sales for this customer
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, total_amount, sale_number, created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      const totalPurchases = sales?.length || 0;
      const totalSpent = sales?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const recentInvoices = sales?.slice(0, 5) || [];

      setCustomerStats({
        totalPurchases,
        totalSpent,
        recentInvoices,
      });
    } catch (error) {
      console.error('Error loading customer stats:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(values)
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({ title: 'Customer updated successfully' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([values]);

        if (error) throw error;
        toast({ title: 'Customer added successfully' });
      }

      setDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
      loadCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({ title: 'Error saving customer', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Customer deleted successfully' });
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({ title: 'Error deleting customer', variant: 'destructive' });
    }
  };

  const handleView = (customer: Customer) => {
    setViewingCustomer(customer);
    loadCustomerStats(customer.id);
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm) ||
    (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingCustomer(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  rules={{ required: 'Phone is required' }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (optional)</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingCustomer ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No customers found</TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{customer.phone}</TableCell>
                    <TableCell>{customer.email || '-'}</TableCell>
                    <TableCell>{customer.address || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCustomer(customer);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {viewingCustomer && (
        <Dialog open={!!viewingCustomer} onOpenChange={() => setViewingCustomer(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Customer Details: {viewingCustomer.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Purchases</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{customerStats?.totalPurchases || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Total Spent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      ${customerStats?.totalSpent?.toFixed(2) || '0.00'}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Recent Invoices</h3>
                {customerStats?.recentInvoices && customerStats.recentInvoices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerStats.recentInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.sale_number}</TableCell>
                          <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">${Number(invoice.total_amount).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground">No invoices yet</p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}