import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const demoVendors = [
  {
    email: 'vendora@procurement.com',
    name: 'Venkatesh Rao (Omkar Wholesale Agro)',
    company: 'Omkar Wholesale Agro & Grains Depot',
    contact: 'Venkatesh Rao',
    address: 'Shed 45, APMC Yard, Peenya Industrial Area, Bengaluru - 560058',
    phone: '+91 98440 22334',
    rating: 4.40
  },
  {
    email: 'vendorb@procurement.com',
    name: 'Arun Shetty (Karnataka Central Staples)',
    company: 'Karnataka Central Staples Supply Hub',
    contact: 'Arun Shetty',
    address: 'Gate 2, APMC Yard, Yeshwanthpur, Bengaluru - 560022',
    phone: '+91 98800 33445',
    rating: 4.75
  },
  {
    email: 'vendorc@procurement.com',
    name: 'Pradeep Patil (Deccan Pulses & Grains)',
    company: 'Deccan Pulses & Grains Wholesale Depot',
    contact: 'Pradeep Patil',
    address: 'Plot 18, Whitefield Commodity Logistics Zone, Bengaluru - 560066',
    phone: '+91 99450 44556',
    rating: 4.90
  },
  {
    email: 'vendord@procurement.com',
    name: 'Sudhir Bhat (Mysore Spices & Commodity)',
    company: 'Mysore Spices & Commodity Wholesale Hub',
    contact: 'Sudhir Bhat',
    address: 'Wholesale Complex #7, K.R. Market Wholesale Depot, Bengaluru - 560002',
    phone: '+91 94490 55667',
    rating: 4.25
  },
  {
    email: 'vendore@procurement.com',
    name: 'Kavitha Rao (Sahya Fresh & Dairy)',
    company: 'Sahya Fresh Produce & Dairy Supply',
    contact: 'Kavitha Rao',
    address: 'Wholesale Block 3, Yeshwanthpur APMC, Bengaluru',
    phone: '+91 98450 77005',
    rating: 4.65
  },
  {
    email: 'vendorf@procurement.com',
    name: 'Mohammed Irfan (MarketLink Foods)',
    company: 'MarketLink Foods & Household Wholesale',
    contact: 'Mohammed Irfan',
    address: 'Unit 12, K.R. Market Wholesale Complex, Bengaluru',
    phone: '+91 98450 77006',
    rating: 4.55
  },
  {
    email: 'vendorg@procurement.com',
    name: 'Nandita Kulkarni (GreenBasket Distributors)',
    company: 'GreenBasket Grocery & Produce Distributors',
    contact: 'Nandita Kulkarni',
    address: 'Warehouse 8, Peenya Industrial Area, Bengaluru',
    phone: '+91 98450 77007',
    rating: 4.80
  }
];

const categoryBasePrices = {
  Vegetables: 45,
  Fruits: 85,
  Dairy: 75,
  Bakery: 55,
  'Dals & Pulses': 140,
  'Rice & Grains': 110,
  'Flours & Atta': 100,
  'Edible Oils & Ghee': 250,
  'Sugar & Salt': 55,
  'Spices & Masalas': 90,
  'Beverages & Tea': 160,
  'Snacks & Breakfast': 75
};

const run = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const passwordHash = await bcrypt.hash('pass123', 10);

    for (const [index, vendor] of demoVendors.entries()) {
      await client.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone)
         VALUES ($1, $2, 'Vendor', $3, $4)
         ON CONFLICT (email) DO NOTHING`,
        [vendor.email, passwordHash, vendor.name, vendor.phone]
      );
      const userResult = await client.query(
        `SELECT id, role FROM users WHERE email = $1 FOR UPDATE`,
        [vendor.email]
      );
      const user = userResult.rows[0];
      if (!user || user.role !== 'Vendor') {
        throw new Error(`${vendor.email} exists but is not a Vendor account; no account was changed.`);
      }

      await client.query(
        `INSERT INTO vendor_profiles (user_id, company_name, rating, tax_id, address, contact_person)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, vendor.company, vendor.rating, `DEMO-VENDOR-${index + 1}`, vendor.address, vendor.contact]
      );
    }

    const vendorsResult = await client.query(
      `SELECT u.id, u.email
       FROM users u
       JOIN vendor_profiles vp ON vp.user_id = u.id
       WHERE u.role = 'Vendor' AND u.is_active = TRUE
         AND u.email = ANY($1::text[])
       ORDER BY u.email`,
      [demoVendors.map((vendor) => vendor.email)]
    );
    const vendorEmails = new Set(vendorsResult.rows.map((vendor) => vendor.email));
    const missingVendorProfiles = demoVendors.filter((vendor) => !vendorEmails.has(vendor.email)).map((vendor) => vendor.email);
    if (missingVendorProfiles.length > 0) {
      throw new Error(`Could not create profiles for demo vendors: ${missingVendorProfiles.join(', ')}.`);
    }

    const productsResult = await client.query(
      `SELECT id, category FROM products WHERE is_active = TRUE ORDER BY id`
    );
    if (productsResult.rows.length === 0) {
      throw new Error('No active catalog products found. Seed products before running the vendor catalog seeder.');
    }

    let insertedListings = 0;
    const indexByEmail = new Map(demoVendors.map((vendor, index) => [vendor.email, index]));
    for (const vendor of vendorsResult.rows) {
      const vendorIndex = indexByEmail.get(vendor.email);
      for (const product of productsResult.rows) {
        const categoryBase = categoryBasePrices[product.category] || 100;
        const priceFactor = 0.88 + ((vendorIndex * 7 + Number(product.id) * 3) % 25) / 100;
        const stock = 12 + ((vendorIndex * 29 + Number(product.id) * 17) % 150);
        const unitPrice = Number((categoryBase * priceFactor).toFixed(2));
        const result = await client.query(
          `INSERT INTO vendor_stock (vendor_id, product_id, available_stock, unit_price, lead_time_days)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (vendor_id, product_id) DO NOTHING`,
          [vendor.id, product.id, stock, unitPrice, 1 + ((vendorIndex + Number(product.id)) % 5)]
        );
        insertedListings += result.rowCount;
      }
    }

    await client.query('COMMIT');
    console.log(`Vendor catalog ready: ${vendorsResult.rows.length} active vendors, ${productsResult.rows.length} active products.`);
    console.log(`Added or completed seven vendor accounts and ${insertedListings} missing product listings.`);
    console.log('Demo accounts: vendora@procurement.com through vendorg@procurement.com (password: pass123).');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

run().catch((error) => {
  console.error('Vendor catalog seeding failed:', error);
  process.exitCode = 1;
});
