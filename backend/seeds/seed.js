import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

async function seedDatabase() {
  console.log('--- Seeding PostgreSQL Database with Indian Profiles & Groceries Catalog ---');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Clear existing seed data safely
    await client.query(
      'TRUNCATE TABLE audit_logs, notifications, payments, reconciliations, invoices, goods_receipts, stock_reservations, purchase_orders, vendor_enquiry_responses, vendor_enquiries, request_approvals, purchase_requests, shop_stock, vendor_stock, products, finance_profiles, warehouse_profiles, vendor_profiles, shopkeeper_profiles, customer_profiles, users RESTART IDENTITY CASCADE'
    );

    console.log('Hashing passwords...');
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('pass123', salt);

    // 2. Insert demo users across all 6 roles
    const usersData = [
      { email: 'customer@procurement.com', name: 'Arun Sharma', role: 'Customer', phone: '+91 98450 12345' },
      { email: 'customer2@procurement.com', name: 'Priya Rao', role: 'Customer', phone: '+91 98860 67890' },
      { email: 'aditya.hegde@kletech.ac.in', name: 'Aditya S Hegde', role: 'Customer', phone: '+91 97412 34567' },
      { email: 'sneha.iyer@procurement.com', name: 'Sneha Iyer', role: 'Customer', phone: '+91 99001 54321' },
      { email: 'shopkeeper@procurement.com', name: 'Rajesh Kumar Shenoy', role: 'Shopkeeper', phone: '+91 98451 98765' },
      { email: 'shopkeeper2@procurement.com', name: 'Sanjay Batakurki', role: 'Shopkeeper', phone: '+91 94482 11223' },
      { email: 'vendora@procurement.com', name: 'Venkatesh Rao (Omkar Wholesale Agro)', role: 'Vendor', phone: '+91 98440 22334' },
      { email: 'vendorb@procurement.com', name: 'Arun Shetty (Karnataka Central Staples)', role: 'Vendor', phone: '+91 98800 33445' },
      { email: 'vendorc@procurement.com', name: 'Pradeep Patil (Deccan Pulses & Grains)', role: 'Vendor', phone: '+91 99450 44556' },
      { email: 'vendord@procurement.com', name: 'Sudhir Bhat (Mysore Spices & Commodity)', role: 'Vendor', phone: '+91 94490 55667' },
      { email: 'warehouse@procurement.com', name: 'Devendra Singh', role: 'Warehouse', phone: '+91 98455 66778' },
      { email: 'finance@procurement.com', name: 'Meera Krishnan', role: 'Finance', phone: '+91 98866 77889' },
      { email: 'admin@procurement.com', name: 'FreshCart Administrator', role: 'Admin' },
    ];

    const userMap = {};
    for (const u of usersData) {
      const res = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, role, email`,
        [u.email, passwordHash, u.role, u.name, u.phone]
      );
      userMap[u.email] = res.rows[0].id;
    }
    console.log('✅ Users with real Indian names inserted successfully.');

    // 3. Insert Role Profiles
    // Customers
    await client.query(
      `INSERT INTO customer_profiles (user_id, organization, address, department) VALUES
       ($1, 'Sharma Household & Kirana Consumer Group', '14th Main, 4th Sector, HSR Layout, Bengaluru - 560102', 'General Provisions'),
       ($2, 'Rao Family Bulk Provisions', '8th Cross, 2nd Block, Jayanagar, Bengaluru - 560011', 'Family Kitchen Store'),
       ($3, 'KLE Technological University Campus Store', 'Vidyanagar, Hubballi / BTM Layout Bengaluru', 'Student Cooperative Requisitions'),
       ($4, 'Iyer Caterers & Kitchen Supplies', '15th Cross, Malleshwaram, Bengaluru - 560003', 'Commercial Kitchen & Catering')`,
      [
        userMap['customer@procurement.com'],
        userMap['customer2@procurement.com'],
        userMap['aditya.hegde@kletech.ac.in'],
        userMap['sneha.iyer@procurement.com']
      ]
    );

    // Demo shop coordinates are approximate and can be replaced in each shop profile.
    await client.query(
      `INSERT INTO shopkeeper_profiles (user_id, store_name, branch, address, latitude, longitude) VALUES
       ($1, 'Ramesh Kirana & Provision Stores', 'Basavanagudi Central Branch', 'Shop #12, Gandhi Bazaar Main Road, Basavanagudi, Bengaluru - 560004', 12.9436, 77.5689),
       ($2, 'Sri Balaji Supermarket & Daily Groceries', 'Malleshwaram Retail Depot', 'Plot #48, 8th Cross Road, Malleshwaram, Bengaluru - 560003', 13.0068, 77.5697)`,
      [userMap['shopkeeper@procurement.com'], userMap['shopkeeper2@procurement.com']]
    );

    // Vendors / Warehouses (Real Wholesale Agro Hubs)
    await client.query(
      `INSERT INTO vendor_profiles (user_id, company_name, rating, tax_id, address, contact_person) VALUES
       ($1, 'Omkar Wholesale Agro & Grains Depot', 4.40, 'GSTIN29ABCDE1234F1Z5', 'Shed 45, APMC Yard, Peenya Industrial Area, Bengaluru - 560058', 'Venkatesh Rao'),
       ($2, 'Karnataka Central Staples Supply Hub', 4.75, 'GSTIN29BCDEF2345G1Z6', 'Gate 2, APMC Yard, Yeshwanthpur, Bengaluru - 560022', 'Arun Shetty'),
       ($3, 'Deccan Pulses & Grains Wholesale Depot', 4.90, 'GSTIN29CDEFG3456H1Z7', 'Plot 18, Whitefield Commodity Logistics Zone, Bengaluru - 560066', 'Pradeep Patil'),
       ($4, 'Mysore Spices & Commodity Wholesale Hub', 4.25, 'GSTIN29DEFGH4567I1Z8', 'Wholesale Complex #7, K.R. Market Wholesale Depot, Bengaluru - 560002', 'Sudhir Bhat')`,
      [
        userMap['vendora@procurement.com'],
        userMap['vendorb@procurement.com'],
        userMap['vendorc@procurement.com'],
        userMap['vendord@procurement.com'],
      ]
    );

    // Warehouse Dock Facility
    await client.query(
      `INSERT INTO warehouse_profiles (user_id, warehouse_name, location_code, address) VALUES
       ($1, 'Central Agro Logistics Distribution Depot WH-01', 'WH-APMC-01', 'Dock Bay 4, Bangalore Logistics Park, Nelamangala Highway, Bengaluru - 562123')`,
      [userMap['warehouse@procurement.com']]
    );

    // Finance Officer
    await client.query(
      `INSERT INTO finance_profiles (user_id, employee_code, approval_limit) VALUES
       ($1, 'FIN-KIRANA-AUDIT-01', 5000000.00)`,
      [userMap['finance@procurement.com']]
    );

    console.log('✅ Role profiles inserted.');

    // 4. Insert Authentic Indian Groceries Catalog
    const productsData = [
      { name: 'Aashirvaad Shubh Shanti Chakki Atta (10 kg)', category: 'Flours & Atta', unit: 'Bags', description: '100% whole wheat stone-ground chakki fresh superior MP wheat flour (10 kg bag)' },
      { name: 'India Gate Classic Basmati Rice (5 kg)', category: 'Rice & Grains', unit: 'Bags', description: 'Premium aged extra-long grain aromatic royal basmati rice (5 kg pack)' },
      { name: 'Sona Masoori Karnataka Raw Rice (25 kg Bag)', category: 'Rice & Grains', unit: 'Bags', description: 'Naturally aged sweet-scented Karnataka Sona Masoori rice for daily family meals (25 kg bag)' },
      { name: 'Tata Sampann Unpolished Toor Dal (1 kg)', category: 'Dals & Pulses', unit: 'Pcs', description: 'Naturally wholesome unpolished yellow pigeon peas rich in essential dietary protein (1 kg)' },
      { name: 'Tata Sampann Premium Chana Dal (1 kg)', category: 'Dals & Pulses', unit: 'Pcs', description: 'Cleaned, unpolished farm-fresh split Bengal gram lentils (1 kg)' },
      { name: 'Tata Sampann Green Moong Dal (1 kg)', category: 'Dals & Pulses', unit: 'Pcs', description: 'Unpolished wholesome green gram lentils for nutritious dal and khichdi (1 kg)' },
      { name: 'Fortune Sunlite Refined Sunflower Oil (5 L Jar)', category: 'Edible Oils & Ghee', unit: 'Jars', description: 'Light, cholesterol-friendly refined sunflower oil fortified with Vitamin A & D (5 L jar)' },
      { name: 'Fortune Kachi Ghani Pure Mustard Oil (1 L)', category: 'Edible Oils & Ghee', unit: 'Bottles', description: 'Cold-pressed traditional pungent pure mustard cooking oil (1 L bottle)' },
      { name: 'Amul Pure Desi Ghee (1 L Tin)', category: 'Edible Oils & Ghee', unit: 'Tins', description: 'Traditional golden cow milk ghee with rich aroma and authentic grainy texture (1 L tin)' },
      { name: 'Madhur Pure Sulphurless Sugar (5 kg)', category: 'Sugar & Salt', unit: 'Bags', description: '100% sparkling white natural crystal sugar refined with hygienic sulphurless process (5 kg bag)' },
      { name: 'Tata Salt Vacuum Evaporated Iodized Salt (1 kg)', category: 'Sugar & Salt', unit: 'Pcs', description: 'India favorite vacuum-evaporated table salt with guaranteed iodine purity (1 kg packet)' },
      { name: 'Everest Turmeric Powder / Haldi (500 g)', category: 'Spices & Masalas', unit: 'Packets', description: 'Pure fragrant golden yellow turmeric powder with rich natural curcumin content (500 g)' },
      { name: 'Everest Tikhalal Red Chilli Powder (500 g)', category: 'Spices & Masalas', unit: 'Packets', description: 'Sun-dried premium hot red chilli powder delivering bright color and sharp pungency (500 g)' },
      { name: 'MDH Super Garam Masala (100 g)', category: 'Spices & Masalas', unit: 'Boxes', description: 'Aromatic royal blend of 15 authentic whole spices ground to perfection (100 g box)' },
      { name: 'Catch Whole Cumin Seeds / Jeera (200 g)', category: 'Spices & Masalas', unit: 'Packets', description: 'Specially selected aromatic jeera seeds ideal for tempering and Indian curries (200 g)' },
      { name: 'Brooke Bond Red Label Strong CTC Tea (500 g)', category: 'Beverages & Tea', unit: 'Packets', description: 'Strong Assam CTC black tea blend with rich taste, deep amber color and revitalizing strength (500 g)' },
      { name: 'Nescafe Classic 100% Pure Instant Coffee (100 g Jar)', category: 'Beverages & Tea', unit: 'Jars', description: 'Signature dark roast pure coffee granules delivering classic aroma and full-bodied taste (100 g jar)' },
      { name: 'Parle-G Gold Biscuits (1 kg Family Pack)', category: 'Snacks & Breakfast', unit: 'Packs', description: 'Classic Indian wheat and milk glucose tea-time biscuits family mega saver pack (1 kg)' },
      { name: 'Maggi 2-Minute Masala Instant Noodles (12-Pack Value Pack)', category: 'Snacks & Breakfast', unit: 'Packs', description: 'Favorite 2-minute instant noodles made with authentic roasted spices and herbs (Pack of 12)' },
      { name: 'Haldiram Nagpur Classic Bhujia Sev (400 g)', category: 'Snacks & Breakfast', unit: 'Packets', description: 'Crispy spicy tepary bean and chickpea noodles seasoned with royal spices (400 g pouch)' }
    ];

    const productMap = {};
    for (const p of productsData) {
      const res = await client.query(
        `INSERT INTO products (name, category, unit, description)
         VALUES ($1, $2, $3, $4) RETURNING id, name`,
        [p.name, p.category, p.unit, p.description]
      );
      productMap[p.name] = res.rows[0].id;
    }
    console.log('✅ 20 Indian grocery staple products inserted.');

    // 5. Insert Vendor Wholesale Stock & Pricing
    // Demonstrating ENGINE 2 (Single-vendor Full-Quantity Filter & Lowest Price Sorting):
    // For Aashirvaad Atta (10 kg) [Target Requisition = 20 Bags]:
    // Vendor A (Omkar Agro): Stock = 15 bags @ ₹410.00 (INSUFFICIENT -> Filtered out by E2)
    // Vendor D (Mysore Spices): Stock = 10 bags @ ₹405.00 (INSUFFICIENT -> Filtered out by E2)
    // Vendor B (Karnataka Staples): Stock = 35 bags @ ₹415.00 (ELIGIBLE)
    // Vendor C (Deccan Pulses): Stock = 30 bags @ ₹395.00 (ELIGIBLE & RECOMMENDED - Lowest Price!)
    const attaId = productMap['Aashirvaad Shubh Shanti Chakki Atta (10 kg)'];
    const basmatiId = productMap['India Gate Classic Basmati Rice (5 kg)'];
    const sonaMasooriId = productMap['Sona Masoori Karnataka Raw Rice (25 kg Bag)'];
    const toorDalId = productMap['Tata Sampann Unpolished Toor Dal (1 kg)'];
    const oilId = productMap['Fortune Sunlite Refined Sunflower Oil (5 L Jar)'];
    const gheeId = productMap['Amul Pure Desi Ghee (1 L Tin)'];
    const sugarId = productMap['Madhur Pure Sulphurless Sugar (5 kg)'];
    const teaId = productMap['Brooke Bond Red Label Strong CTC Tea (500 g)'];

    await client.query(`
      INSERT INTO vendor_stock (vendor_id, product_id, available_stock, unit_price, lead_time_days) VALUES
      -- Aashirvaad Atta 10kg
      ($1, $5, 15, 410.00, 2),
      ($2, $5, 35, 415.00, 3),
      ($3, $5, 30, 395.00, 1),
      ($4, $5, 10, 405.00, 2),

      -- India Gate Basmati Rice 5kg
      ($1, $6, 40, 520.00, 3),
      ($2, $6, 25, 510.00, 2),
      ($3, $6, 60, 495.00, 1),
      ($4, $6, 18, 530.00, 4),

      -- Sona Masoori Rice 25kg Bag
      ($1, $7, 80, 1220.00, 2),
      ($2, $7, 50, 1240.00, 3),
      ($3, $7, 100, 1190.00, 1),
      ($4, $7, 30, 1210.00, 2),

      -- Tata Sampann Toor Dal 1kg
      ($1, $8, 120, 142.00, 1),
      ($2, $8, 90, 145.00, 2),
      ($3, $8, 200, 138.00, 1),
      ($4, $8, 70, 140.00, 2),

      -- Fortune Sunflower Oil 5L
      ($1, $9, 45, 620.00, 2),
      ($2, $9, 30, 615.00, 3),
      ($3, $9, 50, 595.00, 1),
      ($4, $9, 20, 630.00, 2),

      -- Amul Pure Desi Ghee 1L Tin
      ($1, $10, 25, 560.00, 2),
      ($2, $10, 40, 550.00, 2),
      ($3, $10, 35, 545.00, 1),
      ($4, $10, 15, 570.00, 3),

      -- Madhur Pure Sugar 5kg
      ($1, $11, 100, 218.00, 1),
      ($2, $11, 150, 215.00, 2),
      ($3, $11, 80, 212.00, 1),
      ($4, $11, 60, 220.00, 2),

      -- Brooke Bond Red Label Tea 500g
      ($1, $12, 60, 235.00, 2),
      ($2, $12, 80, 230.00, 1),
      ($3, $12, 110, 225.00, 1),
      ($4, $12, 40, 240.00, 2)
    `, [
      userMap['vendora@procurement.com'],
      userMap['vendorb@procurement.com'],
      userMap['vendorc@procurement.com'],
      userMap['vendord@procurement.com'],
      attaId,
      basmatiId,
      sonaMasooriId,
      toorDalId,
      oilId,
      gheeId,
      sugarId,
      teaId
    ]);
    console.log('✅ Vendor wholesale grocery inventory and pricing configured.');

    // Demo retail offers for the grocery comparison storefront.
    const retailOffers = [
      [userMap['shopkeeper@procurement.com'], attaId, 16, 455.00, 180],
      [userMap['shopkeeper2@procurement.com'], attaId, 24, 449.00, 210],
      [userMap['shopkeeper@procurement.com'], basmatiId, 18, 565.00, 180],
      [userMap['shopkeeper2@procurement.com'], basmatiId, 12, 559.00, 210],
      [userMap['shopkeeper@procurement.com'], sonaMasooriId, 20, 1320.00, 180],
      [userMap['shopkeeper2@procurement.com'], sonaMasooriId, 16, 1299.00, 210],
      [userMap['shopkeeper@procurement.com'], toorDalId, 30, 165.00, 180],
      [userMap['shopkeeper2@procurement.com'], toorDalId, 25, 162.00, 210],
      [userMap['shopkeeper@procurement.com'], oilId, 14, 675.00, 180],
      [userMap['shopkeeper2@procurement.com'], oilId, 18, 669.00, 210],
      [userMap['shopkeeper@procurement.com'], gheeId, 10, 615.00, 180],
      [userMap['shopkeeper2@procurement.com'], gheeId, 12, 609.00, 210],
      [userMap['shopkeeper@procurement.com'], sugarId, 22, 249.00, 180],
      [userMap['shopkeeper2@procurement.com'], sugarId, 30, 245.00, 210],
      [userMap['shopkeeper@procurement.com'], teaId, 12, 275.00, 180],
      [userMap['shopkeeper2@procurement.com'], teaId, 18, 269.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Tata Sampann Premium Chana Dal (1 kg)'], 24, 159.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Tata Sampann Premium Chana Dal (1 kg)'], 20, 155.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Tata Sampann Green Moong Dal (1 kg)'], 18, 165.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Tata Sampann Green Moong Dal (1 kg)'], 22, 159.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Fortune Kachi Ghani Pure Mustard Oil (1 L)'], 14, 180.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Fortune Kachi Ghani Pure Mustard Oil (1 L)'], 16, 175.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Tata Salt Vacuum Evaporated Iodized Salt (1 kg)'], 32, 25.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Tata Salt Vacuum Evaporated Iodized Salt (1 kg)'], 40, 23.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Everest Turmeric Powder / Haldi (500 g)'], 16, 115.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Everest Turmeric Powder / Haldi (500 g)'], 20, 109.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Everest Tikhalal Red Chilli Powder (500 g)'], 14, 165.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Everest Tikhalal Red Chilli Powder (500 g)'], 18, 159.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['MDH Super Garam Masala (100 g)'], 20, 95.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['MDH Super Garam Masala (100 g)'], 22, 91.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Catch Whole Cumin Seeds / Jeera (200 g)'], 20, 80.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Catch Whole Cumin Seeds / Jeera (200 g)'], 18, 76.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Nescafe Classic 100% Pure Instant Coffee (100 g Jar)'], 10, 399.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Nescafe Classic 100% Pure Instant Coffee (100 g Jar)'], 12, 389.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Parle-G Gold Biscuits (1 kg Family Pack)'], 18, 120.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Parle-G Gold Biscuits (1 kg Family Pack)'], 22, 115.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Maggi 2-Minute Masala Instant Noodles (12-Pack Value Pack)'], 16, 168.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Maggi 2-Minute Masala Instant Noodles (12-Pack Value Pack)'], 20, 159.00, 210],
      [userMap['shopkeeper@procurement.com'], productMap['Haldiram Nagpur Classic Bhujia Sev (400 g)'], 14, 120.00, 180],
      [userMap['shopkeeper2@procurement.com'], productMap['Haldiram Nagpur Classic Bhujia Sev (400 g)'], 18, 115.00, 210]
    ];

    for (const [shopkeeperId, productId, stock, price, expiryInDays] of retailOffers) {
      await client.query(
        `INSERT INTO shop_stock (shopkeeper_id, product_id, available_stock, unit_price, expiry_date)
         VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::integer)`,
        [shopkeeperId, productId, stock, price, expiryInDays]
      );
    }
    console.log('✅ Demo shop prices, stock, and expiry dates configured.');

    // 6. Seed Sample Initial Purchase Requests
    // Request 1: Approved - Ready for Shopkeeper Vendor Search (20 Bags of Aashirvaad Atta)
    const req1Res = await client.query(
      `INSERT INTO purchase_requests (request_code, customer_id, product_id, quantity, unit, description, required_date, status)
       VALUES ('REQ-1001', $1, $2, 20, 'Bags', 'Monthly bulk provision quota for HSR Layout residential welfare cooperative', CURRENT_DATE + INTERVAL '7 days', 'Approved')
       RETURNING id`,
      [userMap['customer@procurement.com'], attaId]
    );
    await client.query(
      `INSERT INTO request_approvals (request_id, shopkeeper_id, decision, reason)
       VALUES ($1, $2, 'Approved', 'Quantity validated against community monthly store quota and inventory space')`,
      [req1Res.rows[0].id, userMap['shopkeeper@procurement.com']]
    );

    // Request 2: Pending - Ready for Shopkeeper Approval/Rejection demo (5 Jars of Fortune Sunflower Oil 5L)
    const req2Res = await client.query(
      `INSERT INTO purchase_requests (request_code, customer_id, product_id, quantity, unit, description, required_date, status)
       VALUES ('REQ-1002', $1, $2, 5, 'Jars', 'Kitchen supply refill for festive community kitchen dinner', CURRENT_DATE + INTERVAL '10 days', 'Pending')
       RETURNING id`,
      [userMap['customer2@procurement.com'], oilId]
    );

    // Request 3: A completed end-to-end lifecycle order for historical reporting & 3-Way match demonstration
    // (10 Bags of Sona Masoori Raw Rice 25kg Bag @ ₹1,190.00 = ₹11,900.00)
    const req3Res = await client.query(
      `INSERT INTO purchase_requests (request_code, customer_id, product_id, quantity, unit, description, required_date, status, selected_vendor_id)
       VALUES ('REQ-1003', $1, $2, 10, 'Bags', 'Bulk raw rice supply for campus cooperative dining mess', CURRENT_DATE - INTERVAL '14 days', 'Completed', $3)
       RETURNING id`,
      [userMap['aditya.hegde@kletech.ac.in'], sonaMasooriId, userMap['vendorc@procurement.com']]
    );
    const req3Id = req3Res.rows[0].id;

    // PO for Request 3
    const poRes = await client.query(
      `INSERT INTO purchase_orders (po_number, request_id, shopkeeper_id, vendor_id, product_id, quantity, unit_price, total_amount, status, order_date)
       VALUES ('PO-2001', $1, $2, $3, $4, 10, 1190.00, 11900.00, 'Received', CURRENT_TIMESTAMP - INTERVAL '10 days')
       RETURNING id`,
      [req3Id, userMap['shopkeeper@procurement.com'], userMap['vendorc@procurement.com'], sonaMasooriId]
    );
    const poId = poRes.rows[0].id;

    // GRN for Request 3 (Warehouse Inspection)
    const grnRes = await client.query(
      `INSERT INTO goods_receipts (grn_number, po_id, warehouse_id, ordered_quantity, received_quantity, damaged_quantity, missing_quantity, status, remarks, receipt_date)
       VALUES ('GRN-3001', $1, $2, 10, 10, 0, 0, 'Full', 'All 10 Sona Masoori 25kg bags physically inspected at APMC dock Bay 4, zero damage, verified moisture-free', CURRENT_TIMESTAMP - INTERVAL '7 days')
       RETURNING id`,
      [poId, userMap['warehouse@procurement.com']]
    );
    const grnId = grnRes.rows[0].id;

    // Invoice for Request 3 (Vendor Tax Invoice)
    const invRes = await client.query(
      `INSERT INTO invoices (invoice_number, po_id, vendor_id, quantity, unit_price, total_amount, invoice_date, status)
       VALUES ('GST-INV-2026-4001', $1, $2, 10, 1190.00, 11900.00, CURRENT_DATE - INTERVAL '6 days', 'Paid')
       RETURNING id`,
      [poId, userMap['vendorc@procurement.com']]
    );
    const invId = invRes.rows[0].id;

    // Reconciliation for Request 3 (100% Three-Way Match)
    const recRes = await client.query(
      `INSERT INTO reconciliations (rec_number, po_id, grn_id, invoice_id, finance_id, is_matched, po_amount, invoice_amount, po_quantity, grn_quantity, invoice_quantity, discrepancy_details, status)
       VALUES ('REC-5001', $1, $2, $3, $4, TRUE, 11900.00, 11900.00, 10, 10, 10, 'Automated 3-Way Match Verified: Purchase Order (10 bags @ ₹1,190), Warehouse Receipt (10 bags received, 0 damage), and GST Tax Invoice (10 bags @ ₹1,190) match with zero discrepancy.', 'Approved')
       RETURNING id`,
      [poId, grnId, invId, userMap['finance@procurement.com']]
    );
    const recId = recRes.rows[0].id;

    // Payment for Request 3
    await client.query(
      `INSERT INTO payments (payment_number, reconciliation_id, invoice_id, po_id, finance_id, amount, payment_method, reference_number, status, payment_date)
       VALUES ('PAY-6001', $1, $2, $3, $4, 11900.00, 'NEFT / RTGS Corporate Bank Transfer', 'RTGS-SBIN-20261112-99881', 'Completed', CURRENT_TIMESTAMP - INTERVAL '4 days')`,
      [recId, invId, poId, userMap['finance@procurement.com']]
    );

    // Initial Notifications
    await client.query(`
      INSERT INTO notifications (recipient_id, event_type, title, message, related_entity_type, related_entity_id, is_read) VALUES
      ($1, 'REQUEST_APPROVED', 'Grocery Request Approved', 'Your requisition REQ-1001 for 20 Bags of Aashirvaad Chakki Atta (10kg) was approved by Ramesh Kirana Stores.', 'purchase_requests', $3, FALSE),
      ($2, 'REQUEST_PENDING', 'New Incoming Requisition', 'Customer Priya Rao submitted REQ-1002 for 5 Jars of Fortune Sunflower Oil (5L).', 'purchase_requests', $4, FALSE),
      ($1, 'PAYMENT_RECORDED', 'Procurement Completed & Paid', 'Payment of ₹11,900 for PO-2001 (10 Bags Sona Masoori Rice) recorded by Finance. Workflow Completed successfully.', 'purchase_orders', $5, TRUE)
    `, [
      userMap['customer@procurement.com'],
      userMap['shopkeeper@procurement.com'],
      req1Res.rows[0].id,
      req2Res.rows[0].id,
      poId
    ]);

    // Initial Immutable Audit Logs
    await client.query(`
      INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details) VALUES
      ($1, 'Customer', 'CREATE_REQUEST', 'purchase_requests', $4, '{"code": "REQ-1001", "item": "Aashirvaad Atta 10kg", "qty": 20}'),
      ($2, 'Shopkeeper', 'APPROVE_REQUEST', 'purchase_requests', $4, '{"reason": "Stock quota verified"}'),
      ($3, 'Finance', 'RECORD_PAYMENT', 'payments', 1, '{"amount": 11900.00, "status": "Completed"}')
    `, [
      userMap['customer@procurement.com'],
      userMap['shopkeeper@procurement.com'],
      userMap['finance@procurement.com'],
      req1Res.rows[0].id
    ]);

    await client.query('COMMIT');
    console.log('🎉 Seeding successfully finished with authentic Indian users and grocery catalog!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
