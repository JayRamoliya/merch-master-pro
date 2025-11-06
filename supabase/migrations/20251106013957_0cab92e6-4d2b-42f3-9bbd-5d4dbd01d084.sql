-- Add barcode column to products table
ALTER TABLE public.products 
ADD COLUMN barcode text UNIQUE;