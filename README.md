# Centralized Procurement Management System

An enterprise-grade, multi-role procurement workflow platform designed for engineering and corporate procurement operations. The platform connects **Customers**, **Shopkeepers**, **Vendors**, **Warehouse Staff**, **Finance Officers**, and **Admins** through a single centralized PostgreSQL relational database.

---

## 🏛️ Architectural Overview

The system replaces fragmented spreadsheets and siloed purchasing tools with an ACID-compliant, transactional lifecycle that guarantees strict data integrity, zero order splitting, race-condition-free stock reservations, and automated three-way financial reconciliation.

```
[ Customer ] ──(Purchase Request)──> [ Shopkeeper ] ──(Vendor Selection & PO)──> [ Vendor ]
      ▲                                      │                                      │
      │ (Completed Notification)             ▼ (GRN Notification)                  ▼ (Digital Invoice)
[ Finance Officer ] <──(3-Way Matching & Payment)── [ Warehouse Staff ] <──(Shipment Delivery)
```

---

## ⚡ The Four Core Technical Engines

| Engine | Technical Responsibilities |
|---|---|
| **Engine 1: Procurement Workflow Engine** | Enforces valid state transitions (`Pending` → `Approved`/`Rejected` → `Vendor Selected` → `Ordered` → `Received` → `Completed`), server-side RBAC, notification dispatch, and immutable audit logs. |
| **Engine 2: Vendor Selection & Decision Engine** | Enforces the strict **single-vendor full-quantity rule** (`available_stock >= requested_quantity`). Filters out incapable suppliers, prevents order splitting, ranks suppliers, and recommends the lowest-price eligible vendor. |
| **Engine 3: Data, Transaction & Integrity Engine** | Performs automated **Three-Way Matching** across Purchase Orders (PO), Goods Receipts (GRN), and Vendor Invoices. Blocks payment on any price, quantity, or damage discrepancy. Executes atomic payment settlement. |
| **Engine 4: Concurrent Stock & Resource Engine** | Utilizes PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) in an atomic transaction to serialize simultaneous stock reservations and prevent race conditions or inventory overselling. |

---

## 🔑 Demo Login Credentials

All accounts are pre-seeded with the uniform password: `pass123`

| Role Portal | Portal Route | Demo Email | Access Permissions |
|---|---|---|---|
| **Customer** | `/login/customer` | `customer@procurement.com` | Browse groceries, compare shop prices and expiry dates, and track requests. No delivery service. |
| **Shopkeeper** | `/login/shopkeeper` | `shopkeeper@procurement.com` | Manage retail price, stock, expiry, and fixed shop coordinates; process requests. |
| **Vendor (Supplier C)** | `/login/vendor` | `vendorc@procurement.com` | Manage inventory stock/prices, answer enquiries, submit invoices. |
| **Finance Officer** | `/login/finance` | `finance@procurement.com` | Perform 3-way reconciliation, detect discrepancies, disburse payments. |
| **Admin** | `/login/admin` | `admin@procurement.com` | Manage user and shop access, catalog products, all shop listings, and view requests/orders. |

The public landing page shows five login choices. The existing Warehouse role remains available at `/login/warehouse` for the internal procurement workflow. Admin accounts are provisioned by an administrator and cannot self-register.

*Alternative test accounts:*
- Customer 2: `customer2@procurement.com`
- Vendor A: `vendora@procurement.com` (15 stock, ₹450)
- Vendor B: `vendorb@procurement.com` (30 stock, ₹500)
- Vendor D: `vendord@procurement.com` (10 stock, ₹420)

---

## 🛠️ Technology Stack

- **Frontend:** React.js 18, Vite, Tailwind CSS, React Router DOM v6, Axios, Lucide React, Recharts
- **Backend:** Node.js, Express.js (ES Modules), JWT Authentication, bcryptjs, Morgan, CORS
- **Database:** PostgreSQL (with `pg` Pool, transactions, constraints, indexes, and row-level locking)
- **Deployment Compatibility:** Vercel (Frontend), Render (Backend), Supabase / Neon / AWS RDS (PostgreSQL)

---

## 🚀 Quick Start Guide (Local Setup)

### 1. Prerequisites
- **Node.js** v18+ and **npm** installed.
- Access to a PostgreSQL database (e.g. Supabase, local PostgreSQL, or cloud instance).

### 2. Configure Backend Environment
Navigate to `backend/.env` (or copy from `.env.example`):
```env
PORT=5000
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/<database>?sslmode=require
JWT_SECRET=super_secret_procurement_system_jwt_key_2026_secure
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Run Database Migrations & Seed Data
```bash
# From the project root, on a fresh/empty database only:
npm run migrate   # Recreates the schema
npm run seed      # Resets data and seeds demo users, products, shop offers, and orders
```

For an existing database, do **not** run `npm run migrate` or `npm run seed`: those commands recreate the schema or reset seeded data. Apply only the additive retail comparison migration:
```bash
npm run migrate:comparison
npm run seed:comparison-demo
```
The second command adds missing sample listings and approximate demo coordinates without deleting or overwriting existing retail offers. Sign in to each Shopkeeper portal to edit retail prices, stock, and expiry dates under **Store Products & Prices**, and save accurate fixed coordinates under **Store Profile**. The customer product page can then show every shop offer and filter by distance from the customer's browser location or entered coordinates.

To add extra grocery catalog entries and seven demo shopkeepers with listings for every active grocery, without resetting existing data, run:
```bash
npm run seed:extra-groceries
```
This safely adds additional vegetables, fruits, dairy, bakery, pantry, and snack items, then adds a listing at each of seven demo shops for every active catalog product. Existing records are preserved. The demo shop accounts are `groceryshop1@procurement.com` through `groceryshop7@procurement.com`, all using password `pass123`.

To add three more wholesale vendors (seven total with the original four) and fill in missing product listings for each active grocery without overwriting existing vendor stock or prices, run:
```bash
npm run seed:vendor-catalog
```
The additional vendor accounts are `vendore@procurement.com`, `vendorf@procurement.com`, and `vendorg@procurement.com`; all use password `pass123`. In **Vendor Selection & Decision Engine**, add multiple products and quantities to the restock list to compare every vendor against the full basket. A vendor is eligible only when it can fulfill every line.
For multi-product ordering, link each restock line to its own Approved Purchase Request and place the basket with one eligible vendor. Stock reservation and purchase-order creation are transactional: if any line is no longer available or eligible, the complete basket is rolled back.

To enable Admin access on an existing database, apply the additive Admin migration and create the demo Admin account:
```bash
npm run migrate:admin
npm run seed:admin-demo
```
The demo credentials are `admin@procurement.com` / `pass123`. Shopkeepers can create products (which are added to the shared catalog) or add existing catalog products, and manage only their own listings. Admin can manage users, shop access, edit products, and delete catalog products for all shops. Catalog deletion hides a product from new customer requests while preserving historical order data.

### 4. Run Concurrency and E2E Tests
```bash
# Verify Engine 4 row-level locking (10 units, two concurrent 8-unit orders)
npm run test:concurrency

# Verify all 8 mandatory integration scenarios
node tests/test_e2e_workflow.js
```

### 5. Start Backend and Frontend
In terminal 1 (Backend):
```bash
cd backend
npm run dev
# Backend running at http://localhost:5000
# Health check available at http://localhost:5000/api/health
```

In terminal 2 (Frontend):
```bash
cd frontend
npm install
npm run dev
# Frontend running at http://localhost:5173
```

Open your browser to `http://localhost:5173` to access the Centralized Procurement Portal.

To open the app from another device on the same trusted network, find this computer's IPv4 address with `ipconfig` and browse to `http://<IPv4-address>:5173`. Vite forwards `/api` requests to the backend on port 5000. If Windows Firewall prompts, allow Node.js on private networks only; do not expose the development server to public networks.

---

## 🧪 Verification & Test Scenarios

### Test 1: Customer to Shopkeeper
1. Log in at `/login/customer` as `customer@procurement.com` (`pass123`).
2. Submit a purchase request for **20 Mechanical Keyboards**.
3. Log out and log in at `/login/shopkeeper` as `shopkeeper@procurement.com`.
4. Locate the new requisition in **Incoming Requests** and click **Approve**.
5. Log back in as customer to verify real-time status update to **Approved**.

### Test 2 & 3: Single-Vendor Selection & Price Recommendation
1. As shopkeeper, go to **Vendor Discovery** (`/shopkeeper/vendors`).
2. Search for **Mechanical Keyboard** with quantity **20**.
3. Observe evaluation table:
   - **Vendor A** (Stock: 15): Marked **Not Eligible** (cannot supply full 20 units).
   - **Vendor D** (Stock: 10): Marked **Not Eligible** (cannot supply full 20 units).
   - **Vendor B** (Stock: 30, ₹500): Marked **Eligible**.
   - **Vendor C** (Stock: 25, ₹480): Marked **Eligible** and **RECOMMENDED** (lowest price among capable suppliers).
4. Order splitting is strictly prevented. Click **Order (Engine 4)** to confirm PO with Vendor C.

### Test 4: Warehouse Physical Receipt (GRN)
1. Log in at `/login/warehouse` as `warehouse@procurement.com`.
2. Locate the confirmed shipment under **Incoming Orders**.
3. Click **Log GRN**, inspect quantities (Received: 20, Damaged: 0, Missing: 0).
4. Submit GRN. Receipt is committed to PostgreSQL and status becomes **Received**.

### Test 5: Three-Way Reconciliation (Engine 3)
1. Log in at `/login/vendor` as `vendorc@procurement.com`.
2. Under **Purchase Orders**, click **Submit Invoice** to submit `INV-4001` (20 units @ ₹480 = ₹9,600).
3. Log in at `/login/finance` as `finance@procurement.com`.
4. Open **Three-Way Reconciliation** (`/finance/reconciliation`).
5. Compare PO, GRN, and Invoice side-by-side.
6. Click **Execute 3-Way Match**. Observe **100% Match Succeeded**.
7. *(Optional Mismatch Check)*: If an invoice quantity or amount does not match PO/GRN, Engine 3 flags the exact discrepancy and **strictly blocks payment**.

### Test 6: Payment Disbursal & Completion
1. Under approved reconciliation, click **Record Payment**.
2. Enter Bank Reference (`RTGS-SBIN-20261114-001`) and confirm.
3. System marks request as **Completed**.
4. Customer, Shopkeeper, and Vendor receive database completion notifications.

---

## 🗄️ PostgreSQL Database Schema

Normalized relational architecture with 16 primary tables:
1. `users` — Authentication credentials, roles (`Customer`, `Shopkeeper`, `Vendor`, `Warehouse`, `Finance`, `Admin`).
2. `customer_profiles` — Organization, department, delivery address.
3. `shopkeeper_profiles` — Store name, branch, depot details.
4. `vendor_profiles` — Supplier corporate name, tax ID, rating.
5. `warehouse_profiles` — Warehouse facility code, dock location.
6. `finance_profiles` — Employee code, disbursal approval limit.
7. `products` — Normalized catalog items, units, categories, and Admin-managed active status.
8. `vendor_stock` — Supplier inventory with `(vendor_id, product_id)` unique constraint.
9. `purchase_requests` — Client requisitions and lifecycle states.
10. `request_approvals` — Shopkeeper approval/rejection audit trail.
11. `vendor_enquiries` — Requisition enquiries dispatched to vendors.
12. `vendor_enquiry_responses` — Supplier availability and quotations.
13. `purchase_orders` — Confirmed purchase orders linking request and vendor.
14. `stock_reservations` — Atomic stock reservation ledger.
15. `goods_receipts` — Warehouse physical inspection notes (GRN).
16. `invoices` — Supplier digital billing invoices.
17. `reconciliations` — Automated 3-way matching records.
18. `payments` — Disbursal payment records with bank reference numbers.
19. `notifications` — Role-to-role database notification queue.
20. `audit_logs` — Immutable audit trail with IP address and JSON details.

---

## 🌐 Cloud Deployment Guide

### Vercel (Frontend)
1. Push repository to GitHub.
2. In Vercel, import the repository and set **Root Directory** to `frontend`.
3. Set **Framework Preset** to Vite.
4. Set Environment Variable:
   - `VITE_API_URL` = `https://your-backend-render-app.onrender.com/api`
5. Deploy.

### Render (Backend)
1. In Render Dashboard, click **New Web Service** and connect GitHub repository.
2. Set **Root Directory** to `backend`.
3. Set **Build Command** to `npm install`.
4. Set **Start Command** to `node server.js`.
5. Add Environment Variables:
   - `DATABASE_URL` = Your PostgreSQL connection string (`sslmode=require`)
   - `JWT_SECRET` = A strong secret string
   - `NODE_ENV` = `production`
6. Deploy.
