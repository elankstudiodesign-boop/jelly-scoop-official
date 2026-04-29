ALTER TABLE products ADD COLUMN IF NOT EXISTS material_quantity NUMERIC DEFAULT 0;
UPDATE products SET material_quantity = warehouse_quantity, warehouse_quantity = 0 WHERE category = 'Nguyên vật liệu';
