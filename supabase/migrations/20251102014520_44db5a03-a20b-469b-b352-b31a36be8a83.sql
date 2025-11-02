-- Create shop_settings table
CREATE TABLE IF NOT EXISTS public.shop_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_name text NOT NULL DEFAULT 'ShopManager',
  tax_rate numeric NOT NULL DEFAULT 5,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for admins
CREATE POLICY "Admins can manage shop settings"
  ON public.shop_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_shop_settings_updated_at
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.shop_settings (shop_name, tax_rate)
VALUES ('ShopManager', 5)
ON CONFLICT DO NOTHING;