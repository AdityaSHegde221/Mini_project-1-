CREATE TABLE IF NOT EXISTS vendor_basket_enquiries (
  id BIGSERIAL PRIMARY KEY,
  enquiry_code VARCHAR(50) NOT NULL UNIQUE,
  shopkeeper_id BIGINT NOT NULL REFERENCES users(id),
  vendor_id BIGINT NOT NULL REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'Sent'
    CHECK (status IN ('Sent', 'Approved', 'Declined', 'Ordered')),
  vendor_decision VARCHAR(20) CHECK (vendor_decision IN ('Approved', 'Declined')),
  notes TEXT,
  vendor_comments TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_basket_enquiry_items (
  id BIGSERIAL PRIMARY KEY,
  basket_enquiry_id BIGINT NOT NULL REFERENCES vendor_basket_enquiries(id) ON DELETE CASCADE,
  request_id BIGINT NOT NULL REFERENCES purchase_requests(id),
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  quoted_unit_price NUMERIC(12,2),
  available_quantity INTEGER CHECK (available_quantity >= 0),
  estimated_days INTEGER CHECK (estimated_days >= 0),
  purchase_order_id BIGINT UNIQUE REFERENCES purchase_orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (basket_enquiry_id, product_id),
  UNIQUE (basket_enquiry_id, request_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_basket_enquiries_shopkeeper
  ON vendor_basket_enquiries(shopkeeper_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_basket_enquiries_vendor
  ON vendor_basket_enquiries(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_basket_items_request
  ON vendor_basket_enquiry_items(request_id);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMP WITH TIME ZONE;
