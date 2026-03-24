-- Tạo bảng products
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  retail_price NUMERIC,
  margin NUMERIC,
  image_url TEXT,
  price_group TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  warehouse_quantity NUMERIC DEFAULT 0,
  note TEXT,
  supplier_id TEXT,
  is_combo BOOLEAN DEFAULT FALSE,
  combo_items JSONB DEFAULT '[]'::jsonb,
  barcode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo bảng scoop_configs
CREATE TABLE scoop_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  total_items NUMERIC NOT NULL,
  ratio_low NUMERIC NOT NULL,
  ratio_medium NUMERIC NOT NULL,
  ratio_high NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo bảng sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  scoops_sold NUMERIC NOT NULL,
  revenue NUMERIC NOT NULL,
  tiktok_fee_percent NUMERIC NOT NULL,
  packaging_cost_per_scoop NUMERIC NOT NULL,
  average_scoop_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo bảng transactions
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  customer_address TEXT,
  supplier_id TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo bảng suppliers
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo bảng packaging_items
CREATE TABLE packaging_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  barcode TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bật RLS (Row Level Security) nhưng cho phép truy cập công khai (vì đây là app nội bộ)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoop_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on products" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on products" ON products FOR DELETE USING (true);

CREATE POLICY "Allow public read access on scoop_configs" ON scoop_configs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on scoop_configs" ON scoop_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on scoop_configs" ON scoop_configs FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on scoop_configs" ON scoop_configs FOR DELETE USING (true);

CREATE POLICY "Allow public read access on sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on sessions" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on sessions" ON sessions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on sessions" ON sessions FOR DELETE USING (true);

CREATE POLICY "Allow public read access on transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on transactions" ON transactions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on transactions" ON transactions FOR DELETE USING (true);

CREATE POLICY "Allow public read access on suppliers" ON suppliers FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on suppliers" ON suppliers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on suppliers" ON suppliers FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on suppliers" ON suppliers FOR DELETE USING (true);

CREATE POLICY "Allow public read access on packaging_items" ON packaging_items FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on packaging_items" ON packaging_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on packaging_items" ON packaging_items FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access on packaging_items" ON packaging_items FOR DELETE USING (true);

-- Thêm dữ liệu mặc định cho scoop_configs
INSERT INTO scoop_configs (id, name, price, total_items, ratio_low, ratio_medium, ratio_high)
VALUES 
  ('1', 'Scoop Nhỏ', 99000, 10, 4, 3, 3),
  ('2', 'Scoop Vừa', 199000, 22, 8, 7, 7),
  ('3', 'Scoop Lớn', 299000, 35, 12, 11, 12);

-- Bật Realtime cho các bảng
alter publication supabase_realtime add table products;
alter publication supabase_realtime add table scoop_configs;
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table packaging_items;
