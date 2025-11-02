import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Category {
  id: string;
  name: string;
  created_at: string;
}

interface ShopSettings {
  id: string;
  shop_name: string;
  tax_rate: number;
}

const Settings = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [shopName, setShopName] = useState('ShopManager');
  const [taxRate, setTaxRate] = useState('5');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    loadCategories();
    loadShopSettings();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCategoryName.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .insert([{ name: newCategoryName.trim() }]);

      if (error) throw error;

      toast.success('Category added successfully');
      setNewCategoryName('');
      loadCategories();
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditDialogOpen(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editCategoryName.trim() || !editingCategory) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      const { error } = await supabase
        .from('categories')
        .update({ name: editCategoryName.trim() })
        .eq('id', editingCategory.id);

      if (error) throw error;

      toast.success('Category updated successfully');
      setEditDialogOpen(false);
      setEditingCategory(null);
      setEditCategoryName('');
      loadCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Category deleted successfully');
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const loadShopSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('shop_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setShopSettings(data);
        setShopName(data.shop_name);
        setTaxRate(data.tax_rate.toString());
      }
    } catch (error) {
      console.error('Error loading shop settings:', error);
      toast.error('Failed to load shop settings');
    }
  };

  const handleSaveShopSettings = async () => {
    setSavingSettings(true);
    
    try {
      const settingsData = {
        shop_name: shopName,
        tax_rate: parseFloat(taxRate),
      };

      if (shopSettings) {
        const { error } = await supabase
          .from('shop_settings')
          .update(settingsData)
          .eq('id', shopSettings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('shop_settings')
          .insert([settingsData]);

        if (error) throw error;
      }

      toast.success('Shop settings saved successfully');
      loadShopSettings();
    } catch (error) {
      console.error('Error saving shop settings:', error);
      toast.error('Failed to save shop settings');
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Configure your shop preferences</p>
      </div>

      <Card className="p-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Product Categories</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Manage product categories for better organization
            </p>

            <form onSubmit={handleAddCategory} className="flex gap-2 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
              </div>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </form>

            {categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No categories yet. Add your first category above.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Shop Information</h2>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Shop Name</Label>
            <Input 
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Tax Rate (%)</Label>
            <Input 
              type="number" 
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              step="0.01" 
            />
          </div>
          <Button onClick={handleSaveShopSettings} disabled={savingSettings}>
            {savingSettings ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateCategory} className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                placeholder="Enter category name"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Update Category</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
