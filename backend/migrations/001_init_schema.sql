-- ============================================================================
-- Centralized Procurement Management System Database Schema (PostgreSQL)
-- Fully Relational, Normalized, ACID Compliant with RBAC, Foreign Keys & Indexes
-- ============================================================================

-- Clean up existing tables safely in reverse dependency order if migrating fresh
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reconciliations CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS goods_receipts CASCADE;
DROP TABLE IF EXISTS stock_reservations CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS vendor_enquiry_responses CASCADE;
DROP TABLE IF EXISTS vendor_enquiries CASCADE;
DROP TABLE IF EXISTS request_approvals CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;
DROP TABLE IF EXISTS shop_stock CASCADE;
DROP TABLE IF EXISTS vendor_stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS finance_profiles CASCADE;
DROP TABLE IF EXISTS warehouse_profiles CASCADE;
DROP TABLE IF EXISTS vendor_profiles CASCADE;
DROP TABLE IF EXISTS shopkeeper_profiles CASCADE;
DROP TABLE IF EXISTS customer_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Customer', 'Shopkeeper', 'Vendor', 'Warehouse', 'Finance', 'Admin')),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ROLE PROFILES
CREATE TABLE customer_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    organization VARCHAR(255) DEFAULT 'Standard Client',
    address TEXT,
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopkeeper_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    store_name VARCHAR(255) NOT NULL,
    branch VARCHAR(100) DEFAULT 'Main Branch',
    address TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shopkeeper_profiles_latitude_range CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT shopkeeper_profiles_longitude_range CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE vendor_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    rating NUMERIC(3,2) DEFAULT 4.50 CHECK (rating >= 0 AND rating <= 5.0),
    tax_id VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warehouse_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    warehouse_name VARCHAR(255) NOT NULL,
    location_code VARCHAR(50) DEFAULT 'WH-BLR-01',
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE finance_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    employee_code VARCHAR(50) DEFAULT 'FIN-001',
    approval_limit NUMERIC(15,2) DEFAULT 10000000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. PRODUCTS
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) DEFAULT 'Units',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. VENDOR INVENTORY / STOCK
CREATE TABLE vendor_stock (
    id BIGSERIAL PRIMARY KEY,
    vendor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    available_stock INTEGER NOT NULL CHECK (available_stock >= 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    lead_time_days INTEGER DEFAULT 3 CHECK (lead_time_days >= 0),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vendor_product UNIQUE (vendor_id, product_id)
);

-- 4A. SHOPKEEPER RETAIL LISTINGS
CREATE TABLE shop_stock (
    id BIGSERIAL PRIMARY KEY,
    shopkeeper_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    available_stock INTEGER NOT NULL CHECK (available_stock >= 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    expiry_date DATE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_shopkeeper_product UNIQUE (shopkeeper_id, product_id)
);

-- 5. PURCHASE REQUESTS (Lifecycle: Pending -> Approved/Rejected -> Vendor Selected -> Ordered -> Received -> Completed)
CREATE TABLE purchase_requests (
    id BIGSERIAL PRIMARY KEY,
    request_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL REFERENCES users(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) DEFAULT 'Units',
    description TEXT,
    required_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Vendor Selected', 'Ordered', 'Received', 'Completed')),
    selected_vendor_id BIGINT REFERENCES users(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. REQUEST APPROVALS
CREATE TABLE request_approvals (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    shopkeeper_id BIGINT NOT NULL REFERENCES users(id),
    decision VARCHAR(50) NOT NULL CHECK (decision IN ('Approved', 'Rejected')),
    reason TEXT,
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. VENDOR ENQUIRIES
CREATE TABLE vendor_enquiries (
    id BIGSERIAL PRIMARY KEY,
    enquiry_code VARCHAR(50) NOT NULL UNIQUE,
    request_id BIGINT NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
    shopkeeper_id BIGINT NOT NULL REFERENCES users(id),
    vendor_id BIGINT NOT NULL REFERENCES users(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Sent' CHECK (status IN ('Sent', 'Quoted', 'Declined', 'No response')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. VENDOR ENQUIRY RESPONSES
CREATE TABLE vendor_enquiry_responses (
    id BIGSERIAL PRIMARY KEY,
    enquiry_id BIGINT NOT NULL REFERENCES vendor_enquiries(id) ON DELETE CASCADE,
    vendor_id BIGINT NOT NULL REFERENCES users(id),
    available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
    quoted_price NUMERIC(12,2) NOT NULL CHECK (quoted_price > 0),
    estimated_days INTEGER DEFAULT 2,
    comments TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Accepted' CHECK (status IN ('Accepted', 'Declined')),
    responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PURCHASE ORDERS
CREATE TABLE purchase_orders (
    id BIGSERIAL PRIMARY KEY,
    po_number VARCHAR(50) NOT NULL UNIQUE,
    request_id BIGINT NOT NULL REFERENCES purchase_requests(id),
    shopkeeper_id BIGINT NOT NULL REFERENCES users(id),
    vendor_id BIGINT NOT NULL REFERENCES users(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmed' CHECK (status IN ('Confirmed', 'Shipped', 'Received', 'Cancelled')),
    order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. STOCK RESERVATIONS (Audit and link for concurrency tracking)
CREATE TABLE stock_reservations (
    id BIGSERIAL PRIMARY KEY,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    vendor_id BIGINT NOT NULL REFERENCES users(id),
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. GOODS RECEIPTS (GRN)
CREATE TABLE goods_receipts (
    id BIGSERIAL PRIMARY KEY,
    grn_number VARCHAR(50) NOT NULL UNIQUE,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id),
    warehouse_id BIGINT NOT NULL REFERENCES users(id),
    ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
    received_quantity INTEGER NOT NULL CHECK (received_quantity >= 0),
    damaged_quantity INTEGER NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
    missing_quantity INTEGER NOT NULL DEFAULT 0 CHECK (missing_quantity >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'Full' CHECK (status IN ('Full', 'Partial', 'Discrepancy')),
    remarks TEXT,
    receipt_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. VENDOR INVOICES
CREATE TABLE invoices (
    id BIGSERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id),
    vendor_id BIGINT NOT NULL REFERENCES users(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    invoice_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Reconciled', 'Paid', 'Rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. THREE-WAY RECONCILIATIONS
CREATE TABLE reconciliations (
    id BIGSERIAL PRIMARY KEY,
    rec_number VARCHAR(50) NOT NULL UNIQUE,
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id),
    grn_id BIGINT NOT NULL REFERENCES goods_receipts(id),
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    finance_id BIGINT NOT NULL REFERENCES users(id),
    is_matched BOOLEAN NOT NULL DEFAULT FALSE,
    po_amount NUMERIC(12,2) NOT NULL,
    invoice_amount NUMERIC(12,2) NOT NULL,
    po_quantity INTEGER NOT NULL,
    grn_quantity INTEGER NOT NULL,
    invoice_quantity INTEGER NOT NULL,
    discrepancy_details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Approved' CHECK (status IN ('Approved', 'Mismatch')),
    reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. PAYMENTS
CREATE TABLE payments (
    id BIGSERIAL PRIMARY KEY,
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    reconciliation_id BIGINT NOT NULL REFERENCES reconciliations(id),
    invoice_id BIGINT NOT NULL REFERENCES invoices(id),
    po_id BIGINT NOT NULL REFERENCES purchase_orders(id),
    finance_id BIGINT NOT NULL REFERENCES users(id),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(100) NOT NULL DEFAULT 'NEFT / RTGS Transfer',
    reference_number VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Completed', 'Failed')),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. NOTIFICATIONS
CREATE TABLE notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id BIGINT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. IMMUTABLE AUDIT LOGS
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_id BIGINT REFERENCES users(id),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    details JSONB,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR MAXIMUM QUERY AND SEARCH PERFORMANCE
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_stock_product_vendor ON vendor_stock(product_id, available_stock);
CREATE INDEX idx_shop_stock_product_available ON shop_stock(product_id, available_stock);
CREATE INDEX idx_requests_customer ON purchase_requests(customer_id, status);
CREATE INDEX idx_requests_status ON purchase_requests(status);
CREATE INDEX idx_orders_vendor ON purchase_orders(vendor_id, status);
CREATE INDEX idx_orders_request ON purchase_orders(request_id);
CREATE INDEX idx_enquiries_vendor ON vendor_enquiries(vendor_id, status);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
