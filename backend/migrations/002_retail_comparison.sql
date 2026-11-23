ALTER TABLE shopkeeper_profiles
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shopkeeper_profiles_latitude_range'
  ) THEN
    ALTER TABLE shopkeeper_profiles
      ADD CONSTRAINT shopkeeper_profiles_latitude_range
      CHECK (latitude BETWEEN -90 AND 90);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shopkeeper_profiles_longitude_range'
  ) THEN
    ALTER TABLE shopkeeper_profiles
      ADD CONSTRAINT shopkeeper_profiles_longitude_range
      CHECK (longitude BETWEEN -180 AND 180);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS shop_stock (
  id BIGSERIAL PRIMARY KEY,
  shopkeeper_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  available_stock INTEGER NOT NULL CHECK (available_stock >= 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  expiry_date DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_shopkeeper_product UNIQUE (shopkeeper_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_stock_product_available
  ON shop_stock(product_id, available_stock);
