import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Minus, ShoppingCart, Trash2, User, Scan } from 'lucide-react';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const POS = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [keyboardBuffer, setKeyboardBuffer] = useState('');

  useEffect(() => {
    loadProducts();
    loadCustomers();
  }, []);

  // Handle external barcode scanner (keyboard input)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Enter key signals end of barcode scan
      if (e.key === 'Enter' && keyboardBuffer.length > 0) {
        handleBarcodeScanned(keyboardBuffer);
        setKeyboardBuffer('');
        return;
      }

      // Build up the barcode string
      if (e.key.length === 1) {
        setKeyboardBuffer(prev => prev + e.key);
        
        // Clear buffer after 100ms of no input (barcode scanners type fast)
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setKeyboardBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeoutId);
    };
  }, [keyboardBuffer, products]);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, price')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(
      p => p.sku.toLowerCase() === barcode.toLowerCase()
    );

    if (product) {
      addToCart(product);
      toast.success(`Added ${product.name} to cart`);
    } else {
      toast.error('Product not found with barcode: ' + barcode);
    }
  };

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      setCart([...cart, {
        product,
        quantity: 1,
        total: product.price
      }]);
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => {
      if (item.product.id === productId) {
        return {
          ...item,
          quantity: newQuantity,
          total: item.product.price * newQuantity
        };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.05; // 5% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate sale number
      const saleNumber = `SALE-${Date.now()}`;
      
      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{
          sale_number: saleNumber,
          customer_name: customerName || 'Walk-in Customer',
          payment_method: paymentMethod,
          payment_status: 'paid',
          tax_amount: calculateTax(),
          total_amount: calculateTotal(),
          created_by: user.id
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      // Save customer if phone number is provided and doesn't exist
      if (phoneNumber && customerName) {
        const existingCustomer = customers.find(c => c.phone === phoneNumber);
        if (!existingCustomer) {
          const { error: customerError } = await supabase
            .from('customers')
            .insert([{
              name: customerName,
              phone: phoneNumber
            }]);
          
          if (!customerError) {
            loadCustomers(); // Reload customers list
          }
        }
      }

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        total_price: item.total
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      toast.success('Sale completed successfully!');
      
      // Send order details to WhatsApp if phone number is provided
      if (phoneNumber) {
        const orderDetails = cart.map(item => 
          `${item.product.name} x${item.quantity} = ₹${item.total.toFixed(2)}`
        ).join('\n');
        
        const message = `*New Order - ${saleNumber}*\n\n` +
          `Customer: ${customerName || 'Walk-in Customer'}\n` +
          `Phone: ${phoneNumber}\n\n` +
          `*Order Details:*\n${orderDetails}\n\n` +
          `Subtotal: ₹${calculateSubtotal().toFixed(2)}\n` +
          `Tax (5%): ₹${calculateTax().toFixed(2)}\n` +
          `*Total: ₹${calculateTotal().toFixed(2)}*\n\n` +
          `Payment: ${paymentMethod.toUpperCase()}`;
        
        const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
      
      // Reset form
      setCart([]);
      setCustomerName('');
      setPhoneNumber('');
      setPaymentMethod('cash');
    } catch (error) {
      console.error('Error processing sale:', error);
      toast.error('Failed to process sale');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-sm md:text-base text-muted-foreground">Process sales and generate invoices</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 md:p-6">
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setScannerOpen(true)}
                title="Scan Barcode"
              >
                <Scan className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="p-3 md:p-4 hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => addToCart(product)}
                >
                  <div className="space-y-2">
                    <p className="font-medium text-sm md:text-base">{product.name}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{product.sku}</p>
                    <p className="text-base md:text-lg font-bold text-primary">₹{product.price.toFixed(2)}</p>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-base md:text-lg font-semibold">Cart</h2>
            </div>

            <div className="space-y-4 mb-4">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-2 pb-4 border-b">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        ₹{item.product.price.toFixed(2)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-1 md:gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 md:h-8 md:w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <span className="w-6 md:w-8 text-center text-sm">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 md:h-8 md:w-8"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      >
                        <Plus className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 md:h-8 md:w-8"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <>
                <div className="space-y-2 py-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>₹{calculateSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (5%):</span>
                    <span>₹{calculateTax().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>₹{calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="grid gap-2">
                    <Label htmlFor="customer">Customer Name</Label>
                    <Input
                      id="customer"
                      placeholder="Walk-in Customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone Number (WhatsApp)</Label>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+91 9876543210"
                            value={phoneNumber}
                            onChange={(e) => {
                              setPhoneNumber(e.target.value);
                              if (e.target.value.length >= 3) {
                                setCustomerPopoverOpen(true);
                              }
                            }}
                          />
                          {customers.filter(c => c.phone.includes(phoneNumber) && phoneNumber.length >= 3).length > 0 && (
                            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search customers..." />
                          <CommandList>
                            <CommandEmpty>No customers found.</CommandEmpty>
                            <CommandGroup>
                              {customers
                                .filter(c => 
                                  phoneNumber.length >= 3 && 
                                  (c.phone.includes(phoneNumber) || c.name.toLowerCase().includes(phoneNumber.toLowerCase()))
                                )
                                .map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.phone}
                                    onSelect={() => {
                                      setPhoneNumber(customer.phone);
                                      setCustomerName(customer.name);
                                      setCustomerPopoverOpen(false);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{customer.name}</span>
                                      <span className="text-sm text-muted-foreground">{customer.phone}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payment">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="credit">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Complete Sale'}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
      />
    </div>
  );
};

export default POS;
