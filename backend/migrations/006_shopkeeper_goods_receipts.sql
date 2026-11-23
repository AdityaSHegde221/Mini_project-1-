ALTER TABLE goods_receipts
  ALTER COLUMN warehouse_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS shopkeeper_id BIGINT REFERENCES users(id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'goods_receipts_exactly_one_receiver'
  ) THEN
    ALTER TABLE goods_receipts
      ADD CONSTRAINT goods_receipts_exactly_one_receiver
      CHECK ((warehouse_id IS NULL) <> (shopkeeper_id IS NULL));
  END IF;
END;
$$;
