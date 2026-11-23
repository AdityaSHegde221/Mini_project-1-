ALTER TABLE goods_receipts
  ADD COLUMN IF NOT EXISTS shop_stock_applied_at TIMESTAMP WITH TIME ZONE;

DO $$
DECLARE
  receipt RECORD;
BEGIN
  FOR receipt IN
    SELECT grn.id AS grn_id,
           grn.shopkeeper_id,
           po.product_id,
           GREATEST(grn.received_quantity - grn.damaged_quantity, 0) AS sellable_quantity
    FROM goods_receipts grn
    JOIN purchase_orders po ON po.id = grn.po_id
    JOIN shop_stock ss
      ON ss.shopkeeper_id = grn.shopkeeper_id
     AND ss.product_id = po.product_id
    WHERE grn.shopkeeper_id IS NOT NULL
      AND grn.shop_stock_applied_at IS NULL
      AND ss.updated_at < grn.receipt_date
    ORDER BY grn.receipt_date, grn.id
  LOOP
    UPDATE shop_stock
    SET available_stock = available_stock + receipt.sellable_quantity,
        updated_at = CURRENT_TIMESTAMP
    WHERE shopkeeper_id = receipt.shopkeeper_id
      AND product_id = receipt.product_id;

    UPDATE goods_receipts
    SET shop_stock_applied_at = CURRENT_TIMESTAMP
    WHERE id = receipt.grn_id;
  END LOOP;
END;
$$;
