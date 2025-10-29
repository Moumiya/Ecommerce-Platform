/*
  # Create E-commerce Database Schema

  ## Overview
  This migration sets up the complete database structure for an e-commerce website including products, categories, shopping cart, and orders.

  ## New Tables

  ### 1. Categories
  - `id` (uuid, primary key) - Unique identifier for category
  - `name` (text) - Category name
  - `created_at` (timestamptz) - Timestamp when category was created

  ### 2. Products
  - `id` (uuid, primary key) - Unique identifier for product
  - `name` (text) - Product name
  - `description` (text) - Product description
  - `price` (numeric) - Product price
  - `image_url` (text) - URL to product image
  - `category_id` (uuid) - Foreign key to categories
  - `stock` (integer) - Available stock quantity
  - `created_at` (timestamptz) - Timestamp when product was created

  ### 3. Cart Items
  - `id` (uuid, primary key) - Unique identifier for cart item
  - `session_id` (text) - Session identifier for anonymous users
  - `product_id` (uuid) - Foreign key to products
  - `quantity` (integer) - Quantity of product in cart
  - `created_at` (timestamptz) - Timestamp when item was added to cart

  ### 4. Orders
  - `id` (uuid, primary key) - Unique identifier for order
  - `session_id` (text) - Session identifier
  - `customer_name` (text) - Customer name
  - `customer_email` (text) - Customer email
  - `customer_address` (text) - Shipping address
  - `total_amount` (numeric) - Total order amount
  - `status` (text) - Order status (pending, completed, cancelled)
  - `created_at` (timestamptz) - Timestamp when order was created

  ### 5. Order Items
  - `id` (uuid, primary key) - Unique identifier for order item
  - `order_id` (uuid) - Foreign key to orders
  - `product_id` (uuid) - Foreign key to products
  - `quantity` (integer) - Quantity ordered
  - `price` (numeric) - Price at time of order
  - `created_at` (timestamptz) - Timestamp when order item was created

  ## Security
  - Enable RLS on all tables
  - Public read access for products and categories (public facing catalog)
  - Public access for cart and orders (anonymous shopping experience)
  
  ## Important Notes
  1. All tables use UUID for primary keys with auto-generation
  2. Timestamps use `now()` as default value
  3. Foreign key constraints ensure referential integrity
  4. Stock tracking is built into products table
  5. Session-based cart for anonymous users
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL CHECK (price >= 0),
  image_url text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  stock integer DEFAULT 0 CHECK (stock >= 0),
  created_at timestamptz DEFAULT now()
);

-- Create cart_items table
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_address text NOT NULL,
  total_amount numeric NOT NULL CHECK (total_amount >= 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories (public read)
CREATE POLICY "Anyone can view categories"
  ON categories FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for products (public read)
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for cart_items (public access for shopping)
CREATE POLICY "Anyone can view their cart items"
  ON cart_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can insert cart items"
  ON cart_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anyone can update their cart items"
  ON cart_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete their cart items"
  ON cart_items FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for orders (public access for checkout)
CREATE POLICY "Anyone can view their orders"
  ON orders FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON orders FOR INSERT
  TO anon
  WITH CHECK (true);

-- RLS Policies for order_items (public access)
CREATE POLICY "Anyone can view order items"
  ON order_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can create order items"
  ON order_items FOR INSERT
  TO anon
  WITH CHECK (true);

-- Insert sample categories
INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Clothing'),
  ('Books'),
  ('Home & Garden')
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Wireless Headphones',
  'High-quality wireless headphones with noise cancellation',
  129.99,
  'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1),
  50
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Wireless Headphones');

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Smart Watch',
  'Feature-packed smartwatch with fitness tracking',
  249.99,
  'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1),
  30
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Smart Watch');

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Laptop Stand',
  'Ergonomic aluminum laptop stand',
  49.99,
  'https://images.pexels.com/photos/7974/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Electronics' LIMIT 1),
  100
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Laptop Stand');

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Denim Jacket',
  'Classic blue denim jacket for all seasons',
  79.99,
  'https://images.pexels.com/photos/1598507/pexels-photo-1598507.jpeg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Clothing' LIMIT 1),
  75
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Denim Jacket');

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Cotton T-Shirt',
  'Comfortable 100% cotton t-shirt',
  24.99,
  'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Clothing' LIMIT 1),
  200
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Cotton T-Shirt');

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Running Shoes',
  'Lightweight running shoes with excellent grip',
  89.99,
  'https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Clothing' LIMIT 1),
  60
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Running Shoes');

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Programming Book',
  'Learn modern web development',
  39.99,
  'https://images.pexels.com/photos/1302991/pexels-photo-1302991.jpeg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Books' LIMIT 1),
  40
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Programming Book');

INSERT INTO products (name, description, price, image_url, category_id, stock)
SELECT 
  'Plant Pot',
  'Ceramic plant pot with drainage',
  19.99,
  'https://images.pexels.com/photos/1084199/pexels-photo-1084199.jpeg?auto=compress&cs=tinysrgb&w=800',
  (SELECT id FROM categories WHERE name = 'Home & Garden' LIMIT 1),
  150
WHERE NOT EXISTS (SELECT 1 FROM products WHERE name = 'Plant Pot');