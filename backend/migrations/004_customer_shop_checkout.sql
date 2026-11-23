CREATE TABLE IF NOT EXISTS retail_orders (
  id BIGSERIAL PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id BIGINT NOT NULL REFERENCES users(id),
  shopkeeper_id BIGINT NOT NULL REFERENCES users(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 500),
  unit VARCHAR(50) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'Interested'
    CHECK (status IN ('Interested', 'Accepted', 'Rejected', 'Invoiced', 'ReceiptMismatch', 'ReceiptConfirmed', 'Completed')),
  shop_decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS retail_order_receipts (
  id BIGSERIAL PRIMARY KEY,
  retail_order_id BIGINT NOT NULL REFERENCES retail_orders(id),
  customer_id BIGINT NOT NULL REFERENCES users(id),
  received_quantity INTEGER NOT NULL CHECK (received_quantity BETWEEN 0 AND 500),
  is_matched BOOLEAN NOT NULL,
  mismatch_details TEXT,
  confirmed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS retail_invoices (
  id BIGSERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  retail_order_id BIGINT NOT NULL REFERENCES retail_orders(id),
  version INTEGER NOT NULL CHECK (version > 0),
  shopkeeper_id BIGINT NOT NULL REFERENCES users(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (retail_order_id, version)
);

CREATE TABLE IF NOT EXISTS retail_payments (
  id BIGSERIAL PRIMARY KEY,
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  retail_order_id BIGINT NOT NULL UNIQUE REFERENCES retail_orders(id),
  invoice_id BIGINT NOT NULL REFERENCES retail_invoices(id),
  customer_id BIGINT NOT NULL REFERENCES users(id),
  shopkeeper_id BIGINT NOT NULL REFERENCES users(id),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method VARCHAR(50) NOT NULL
    CHECK (payment_method IN ('Cash', 'UPI', 'Card', 'Bank transfer', 'Other')),
  reference_number VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'Completed' CHECK (status = 'Completed'),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_retail_orders_customer_created
  ON retail_orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_orders_shopkeeper_status
  ON retail_orders(shopkeeper_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_receipts_order_confirmed
  ON retail_order_receipts(retail_order_id, confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_retail_invoices_order_version
  ON retail_invoices(retail_order_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_retail_payments_customer_date
  ON retail_payments(customer_id, payment_date DESC);

CREATE OR REPLACE FUNCTION prevent_audit_logs_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only; UPDATE and DELETE are not allowed.'
    USING ERRCODE = '55000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_logs_append_only ON audit_logs;
CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_logs_mutation();
