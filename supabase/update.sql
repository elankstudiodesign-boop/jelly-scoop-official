-- Chạy các lệnh này trong SQL Editor của Supabase nếu bạn đã tạo các bảng trước đó
-- và đang bị thiếu cột hoặc bảng mới.

-- 1. Thêm các cột mới vào bảng products (nếu chưa có)
ALTER TABLE products ADD COLUMN IF NOT EXISTS warehouse_quantity NUMERIC DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS margin NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS combo_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;

-- 2. Tạo bảng suppliers (nếu chưa có)
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tạo bảng transactions (nếu chưa có)
CREATE TABLE IF NOT EXISTS transactions (
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

-- 4. Thêm các cột mới vào bảng transactions (nếu bảng đã tồn tại từ trước)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_id TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- 3. Tạo bảng sessions (nếu chưa có)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  scoops_sold NUMERIC NOT NULL,
  revenue NUMERIC NOT NULL,
  tiktok_fee_percent NUMERIC NOT NULL,
  packaging_cost_per_scoop NUMERIC NOT NULL,
  average_scoop_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tạo bảng scoop_configs (nếu chưa có)
CREATE TABLE IF NOT EXISTS scoop_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  total_items NUMERIC NOT NULL,
  ratio_low NUMERIC NOT NULL,
  ratio_medium NUMERIC NOT NULL,
  ratio_high NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Bật RLS và thêm Policy cho các bảng (nếu chưa có)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoop_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Suppliers policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Allow public read access on suppliers'
    ) THEN
        CREATE POLICY "Allow public read access on suppliers" ON suppliers FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Allow public insert access on suppliers'
    ) THEN
        CREATE POLICY "Allow public insert access on suppliers" ON suppliers FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Allow public update access on suppliers'
    ) THEN
        CREATE POLICY "Allow public update access on suppliers" ON suppliers FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'suppliers' AND policyname = 'Allow public delete access on suppliers'
    ) THEN
        CREATE POLICY "Allow public delete access on suppliers" ON suppliers FOR DELETE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Allow public read access on transactions'
    ) THEN
        CREATE POLICY "Allow public read access on transactions" ON transactions FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Allow public insert access on transactions'
    ) THEN
        CREATE POLICY "Allow public insert access on transactions" ON transactions FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Allow public update access on transactions'
    ) THEN
        CREATE POLICY "Allow public update access on transactions" ON transactions FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'Allow public delete access on transactions'
    ) THEN
        CREATE POLICY "Allow public delete access on transactions" ON transactions FOR DELETE USING (true);
    END IF;

    -- Sessions policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow public read access on sessions'
    ) THEN
        CREATE POLICY "Allow public read access on sessions" ON sessions FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow public insert access on sessions'
    ) THEN
        CREATE POLICY "Allow public insert access on sessions" ON sessions FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow public update access on sessions'
    ) THEN
        CREATE POLICY "Allow public update access on sessions" ON sessions FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow public delete access on sessions'
    ) THEN
        CREATE POLICY "Allow public delete access on sessions" ON sessions FOR DELETE USING (true);
    END IF;

    -- Scoop Configs policies
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scoop_configs' AND policyname = 'Allow public read access on scoop_configs'
    ) THEN
        CREATE POLICY "Allow public read access on scoop_configs" ON scoop_configs FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scoop_configs' AND policyname = 'Allow public insert access on scoop_configs'
    ) THEN
        CREATE POLICY "Allow public insert access on scoop_configs" ON scoop_configs FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scoop_configs' AND policyname = 'Allow public update access on scoop_configs'
    ) THEN
        CREATE POLICY "Allow public update access on scoop_configs" ON scoop_configs FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scoop_configs' AND policyname = 'Allow public delete access on scoop_configs'
    ) THEN
        CREATE POLICY "Allow public delete access on scoop_configs" ON scoop_configs FOR DELETE USING (true);
    END IF;
END
$$;

-- 6. Thêm dữ liệu mặc định cho scoop_configs (nếu bảng trống)
INSERT INTO scoop_configs (id, name, price, total_items, ratio_low, ratio_medium, ratio_high)
SELECT '1', 'Scoop Nhỏ', 99000, 10, 4, 3, 3
WHERE NOT EXISTS (SELECT 1 FROM scoop_configs WHERE id = '1');

INSERT INTO scoop_configs (id, name, price, total_items, ratio_low, ratio_medium, ratio_high)
SELECT '2', 'Scoop Vừa', 199000, 22, 8, 7, 7
WHERE NOT EXISTS (SELECT 1 FROM scoop_configs WHERE id = '2');

INSERT INTO scoop_configs (id, name, price, total_items, ratio_low, ratio_medium, ratio_high)
SELECT '3', 'Scoop Lớn', 299000, 35, 12, 11, 12
WHERE NOT EXISTS (SELECT 1 FROM scoop_configs WHERE id = '3');

-- 8. Bật Realtime cho các bảng (nếu chưa bật)
-- Lưu ý: Lệnh này có thể gây lỗi nếu bảng đã có trong publication, 
-- nhưng trong Supabase SQL Editor nó thường được xử lý ổn.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE products;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'scoop_configs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE scoop_configs;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'suppliers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'packaging_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE packaging_items;
    END IF;
END
$$;

-- 7. (Tùy chọn) Cập nhật dữ liệu cũ sang các danh mục giao dịch mới
-- Chạy các lệnh dưới đây nếu bạn muốn chuyển đổi các giao dịch cũ sang danh mục chi tiết hơn
-- UPDATE transactions SET category = 'PACKAGING' WHERE category = 'FEE' AND description ILIKE '%bao bì%';
-- UPDATE transactions SET category = 'PACKAGING' WHERE category = 'FEE' AND description ILIKE '%hộp%';
-- UPDATE transactions SET category = 'SHIPPING' WHERE category = 'FEE' AND description ILIKE '%ship%';
-- UPDATE transactions SET category = 'SHIPPING' WHERE category = 'FEE' AND description ILIKE '%vận chuyển%';
