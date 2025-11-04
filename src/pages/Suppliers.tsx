import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { toast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, FileText, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Supplier {
  id: string;
  name: string;
  contact_phone: string;
  contact_email?: string;
  company?: string;
  address?: string;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  total_amount: number;
  payment_status: string;
  status: string;
  date: string;
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [poDialogOpen, setPODialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>('');
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [supplierPOs, setSupplierPOs] = useState<PurchaseOrder[]>([]);

  const form = useForm({
    defaultValues: {
      name: '',
      contact_phone: '',
      contact_email: '',
      company: '',
      address: '',
    },
  });

  const poForm = useForm({
    defaultValues: {
      supplier_id: '',
      date: new Date().toISOString().split('T')[0],
      payment_status: 'pending',
    },
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (editingSupplier) {
      form.reset(editingSupplier);
    } else {
      form.reset({
        name: '',
        contact_phone: '',
        contact_email: '',
        company: '',
        address: '',
      });
    }
  }, [editingSupplier, form]);

  const loadSuppliers = async () => {
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast({ title: 'Error loading suppliers', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const loadSupplierPOs = async (supplierId: string) => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('supplier_id', supplierId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSupplierPOs(data || []);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingSupplier) {
        const { error } = await supabase
          .from('suppliers')
          .update(values)
          .eq('id', editingSupplier.id);

        if (error) throw error;
        toast({ title: 'Supplier updated successfully' });
      } else {
        const { error } = await supabase
          .from('suppliers')
          .insert([values]);

        if (error) throw error;
        toast({ title: 'Supplier added successfully' });
      }

      setDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
      loadSuppliers();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast({ title: 'Error saving supplier', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;

    try {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Supplier deleted successfully' });
      loadSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast({ title: 'Error deleting supplier', variant: 'destructive' });
    }
  };

  const handleView = (supplier: Supplier) => {
    setViewingSupplier(supplier);
    loadSupplierPOs(supplier.id);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_phone.includes(searchTerm) ||
    (supplier.company && supplier.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Suppliers</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage your supplier database</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={poDialogOpen} onOpenChange={setPODialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none">
                <FileText className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Create PO</span>
                <span className="sm:hidden">PO</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] md:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Purchase Order</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Purchase Order creation will be available soon</p>
            </DialogContent>
          </Dialog>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingSupplier(null)} className="flex-1 md:flex-none">
                <Plus className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Add Supplier</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] md:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    rules={{ required: 'Name is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_phone"
                    rules={{ required: 'Phone is required' }}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Phone</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contact_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Email (optional)</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company/Brand (optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                      {editingSupplier ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:max-w-sm"
        />
      </div>

      {/* Desktop Table View */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No suppliers found</TableCell>
                </TableRow>
              ) : (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.company || '-'}</TableCell>
                    <TableCell>{supplier.contact_phone}</TableCell>
                    <TableCell>{supplier.contact_email || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(supplier)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingSupplier(supplier);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <Card><CardContent className="p-4 text-center">Loading...</CardContent></Card>
        ) : filteredSuppliers.length === 0 ? (
          <Card><CardContent className="p-4 text-center">No suppliers found</CardContent></Card>
        ) : (
          filteredSuppliers.map((supplier) => (
            <Card key={supplier.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-lg">{supplier.name}</h3>
                    {supplier.company && <p className="text-sm text-muted-foreground">{supplier.company}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleView(supplier)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSupplier(supplier);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p><span className="text-muted-foreground">Phone:</span> {supplier.contact_phone}</p>
                  {supplier.contact_email && (
                    <p><span className="text-muted-foreground">Email:</span> {supplier.contact_email}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {viewingSupplier && (
        <Dialog open={!!viewingSupplier} onOpenChange={() => setViewingSupplier(null)}>
          <DialogContent className="w-[95vw] md:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Supplier Details: {viewingSupplier.name}</DialogTitle>
            </DialogHeader>
            <Tabs defaultValue="info">
              <TabsList className="w-full">
                <TabsTrigger value="info" className="flex-1">Information</TabsTrigger>
                <TabsTrigger value="orders" className="flex-1">Purchase Orders</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Company</p>
                    <p>{viewingSupplier.company || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contact Phone</p>
                    <p>{viewingSupplier.contact_phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                    <p>{viewingSupplier.contact_email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p>{viewingSupplier.address || '-'}</p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="orders">
                {supplierPOs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No purchase orders yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PO Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplierPOs.map((po) => (
                        <TableRow key={po.id}>
                          <TableCell>{po.po_number}</TableCell>
                          <TableCell>{new Date(po.date).toLocaleDateString()}</TableCell>
                          <TableCell>${Number(po.total_amount).toFixed(2)}</TableCell>
                          <TableCell>{po.payment_status}</TableCell>
                          <TableCell>{po.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}