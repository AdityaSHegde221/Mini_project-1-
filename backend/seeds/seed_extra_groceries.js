import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const products = [
  {
    name: 'Fresh Red Onion (1 kg)',
    category: 'Vegetables',
    unit: 'Kg',
    description: 'Fresh red onions for everyday cooking.',
    offers: [[40, 32, 35, 29, 14], [35, 34, 30, 30, 14]]
  },
  {
    name: 'Farm Fresh Potato (1 kg)',
    category: 'Vegetables',
    unit: 'Kg',
    description: 'Fresh potatoes suitable for daily meals.',
    offers: [[45, 28, 40, 26, 21], [38, 30, 32, 27, 21]]
  },
  {
    name: 'Fresh Tomato (1 kg)',
    category: 'Vegetables',
    unit: 'Kg',
    description: 'Fresh ripe tomatoes for cooking and salads.',
    offers: [[30, 36, 25, 33, 7], [28, 38, 20, 35, 7]]
  },
  {
    name: 'Amul Taaza Toned Milk (1 L)',
    category: 'Dairy',
    unit: 'Litres',
    description: 'Toned milk for everyday use (1 litre pack).',
    offers: [[24, 68, 20, 66, 10], [20, 69, 18, 67, 10]]
  },
  {
    name: 'Farm Fresh Eggs (12 pcs)',
    category: 'Dairy',
    unit: 'Dozens',
    description: 'A dozen fresh table eggs.',
    offers: [[18, 96, 15, 92, 14], [16, 99, 14, 94, 14]]
  },
  {
    name: 'Fresh Carrot (1 kg)',
    category: 'Vegetables',
    unit: 'Kg',
    description: 'Fresh carrots for cooking, salads, and snacks.',
    offers: [[25, 48, 20, 45, 10], [22, 50, 18, 47, 10]]
  },
  {
    name: 'Fresh Cucumber (1 kg)',
    category: 'Vegetables',
    unit: 'Kg',
    description: 'Crisp cucumbers for salads and everyday meals.',
    offers: [[20, 38, 18, 36, 7], [18, 40, 16, 37, 7]]
  },
  {
    name: 'Fresh Spinach (1 bunch)',
    category: 'Vegetables',
    unit: 'Bunches',
    description: 'Fresh leafy spinach, sold by the bunch.',
    offers: [[18, 25, 15, 23, 3], [16, 27, 14, 24, 3]]
  },
  {
    name: 'Fresh Green Chilli (250 g)',
    category: 'Vegetables',
    unit: 'Packets',
    description: 'Fresh green chillies for seasoning and cooking.',
    offers: [[22, 20, 18, 18, 5], [20, 22, 16, 19, 5]]
  },
  {
    name: 'Fresh Ginger (250 g)',
    category: 'Vegetables',
    unit: 'Packets',
    description: 'Fresh ginger root for cooking, tea, and seasoning.',
    offers: [[16, 32, 14, 30, 10], [14, 34, 12, 31, 10]]
  },
  {
    name: 'Fresh Garlic (250 g)',
    category: 'Vegetables',
    unit: 'Packets',
    description: 'Fresh garlic cloves for everyday cooking.',
    offers: [[18, 36, 15, 33, 14], [16, 38, 14, 35, 14]]
  },
  {
    name: 'Fresh Banana (1 dozen)',
    category: 'Fruits',
    unit: 'Dozens',
    description: 'Fresh ripe bananas, sold by the dozen.',
    offers: [[24, 60, 20, 56, 5], [20, 64, 18, 59, 5]]
  },
  {
    name: 'Fresh Apple (1 kg)',
    category: 'Fruits',
    unit: 'Kg',
    description: 'Fresh apples for snacks and everyday meals.',
    offers: [[18, 180, 15, 172, 14], [16, 185, 14, 178, 14]]
  },
  {
    name: 'Amul Masti Dahi (1 kg)',
    category: 'Dairy',
    unit: 'Packs',
    description: 'Fresh set curd in a 1 kg pack.',
    offers: [[16, 95, 14, 92, 7], [14, 98, 12, 94, 7]]
  },
  {
    name: 'Britannia Fresh White Bread (400 g)',
    category: 'Bakery',
    unit: 'Loaves',
    description: 'Soft sliced white bread for breakfast and snacks.',
    offers: [[20, 40, 18, 38, 5], [18, 42, 16, 39, 5]]
  },
  {
    name: 'Fresh Cauliflower (1 pc)',
    category: 'Vegetables',
    unit: 'Pcs',
    description: 'Fresh whole cauliflower for everyday cooking.',
    basePrice: 40
  },
  {
    name: 'Fresh Capsicum (500 g)',
    category: 'Vegetables',
    unit: 'Packets',
    description: 'Crisp green capsicum for salads and cooking.',
    basePrice: 45
  },
  {
    name: 'Fresh Green Peas (500 g)',
    category: 'Vegetables',
    unit: 'Packets',
    description: 'Sweet green peas for curries and rice dishes.',
    basePrice: 55
  },
  {
    name: 'Fresh Brinjal (1 kg)',
    category: 'Vegetables',
    unit: 'Kg',
    description: 'Farm fresh brinjal for home-cooked meals.',
    basePrice: 45
  },
  {
    name: 'Fresh Lemon (6 pcs)',
    category: 'Fruits',
    unit: 'Packs',
    description: 'Juicy lemons for drinks, seasoning, and cooking.',
    basePrice: 30
  },
  {
    name: 'Fresh Orange (1 kg)',
    category: 'Fruits',
    unit: 'Kg',
    description: 'Juicy seasonal oranges, rich in flavour.',
    basePrice: 90
  },
  {
    name: 'Fresh Grapes (500 g)',
    category: 'Fruits',
    unit: 'Packets',
    description: 'Fresh sweet grapes, ready to enjoy.',
    basePrice: 75
  },
  {
    name: 'Fresh Papaya (1 pc)',
    category: 'Fruits',
    unit: 'Pcs',
    description: 'Ripe whole papaya for breakfast and snacks.',
    basePrice: 65
  },
  {
    name: 'Fresh Coriander Leaves (1 bunch)',
    category: 'Vegetables',
    unit: 'Bunches',
    description: 'Fresh coriander leaves for garnish and seasoning.',
    basePrice: 15
  },
  {
    name: 'Fresh Curry Leaves (1 bunch)',
    category: 'Vegetables',
    unit: 'Bunches',
    description: 'Aromatic curry leaves for everyday seasoning.',
    basePrice: 12
  },
  {
    name: 'Fresh Coconut (1 pc)',
    category: 'Fruits',
    unit: 'Pcs',
    description: 'Whole fresh coconut for cooking and refreshments.',
    basePrice: 35
  },
  {
    name: 'Amul Taaza Toned Milk (500 ml)',
    category: 'Dairy',
    unit: 'Packets',
    description: 'Toned milk in a convenient 500 ml pack.',
    basePrice: 30
  },
  {
    name: 'Amul Butter (100 g)',
    category: 'Dairy',
    unit: 'Pcs',
    description: 'Creamy table butter for breakfast and cooking.',
    basePrice: 58
  },
  {
    name: 'Paneer (200 g)',
    category: 'Dairy',
    unit: 'Packets',
    description: 'Fresh paneer for curries, snacks, and grilling.',
    basePrice: 90
  },
  {
    name: 'Brown Bread (400 g)',
    category: 'Bakery',
    unit: 'Loaves',
    description: 'Sliced whole wheat brown bread.',
    basePrice: 48
  },
  {
    name: 'Toor Dal (1 kg)',
    category: 'Dals & Pulses',
    unit: 'Pcs',
    description: 'Everyday split pigeon peas for dal and sambar.',
    basePrice: 145
  },
  {
    name: 'Kabuli Chana (1 kg)',
    category: 'Dals & Pulses',
    unit: 'Pcs',
    description: 'Whole chickpeas for curries and chana masala.',
    basePrice: 110
  },
  {
    name: 'Poha (1 kg)',
    category: 'Rice & Grains',
    unit: 'Pcs',
    description: 'Flattened rice for breakfast and snacks.',
    basePrice: 65
  },
  {
    name: 'Besan Gram Flour (1 kg)',
    category: 'Flours & Atta',
    unit: 'Pcs',
    description: 'Finely ground gram flour for cooking and snacks.',
    basePrice: 95
  },
  {
    name: 'Jaggery Powder (500 g)',
    category: 'Sugar & Salt',
    unit: 'Packets',
    description: 'Natural jaggery powder for sweetening and cooking.',
    basePrice: 55
  },
  {
    name: 'Cumin Powder (100 g)',
    category: 'Spices & Masalas',
    unit: 'Packets',
    description: 'Ground cumin for seasoning and everyday recipes.',
    basePrice: 42
  },
  {
    name: 'Red Chilli Whole (200 g)',
    category: 'Spices & Masalas',
    unit: 'Packets',
    description: 'Dried whole red chillies for cooking and tempering.',
    basePrice: 68
  },
  {
    name: 'Sunflower Oil (1 L)',
    category: 'Edible Oils & Ghee',
    unit: 'Bottles',
    description: 'Refined sunflower cooking oil in a 1 litre bottle.',
    basePrice: 145
  },
  {
    name: 'Roasted Peanuts (500 g)',
    category: 'Snacks & Breakfast',
    unit: 'Packets',
    description: 'Roasted peanuts for snacks and cooking.',
    basePrice: 75
  }
];

const demoShops = [
  { email: 'groceryshop1@procurement.com', name: 'Ravi Narayan', store: 'Green Basket Grocery', branch: 'Jayanagar Branch', address: '4th Block, Jayanagar, Bengaluru', latitude: 12.9250, longitude: 77.5838 },
  { email: 'groceryshop2@procurement.com', name: 'Lakshmi Prasad', store: 'Daily Needs Mart', branch: 'Vijayanagar Branch', address: 'RPC Layout, Vijayanagar, Bengaluru', latitude: 12.9700, longitude: 77.5350 },
  { email: 'groceryshop3@procurement.com', name: 'Mohammed Irfan', store: 'Fresh Corner Market', branch: 'Indiranagar Branch', address: '100 Feet Road, Indiranagar, Bengaluru', latitude: 12.9784, longitude: 77.6408 },
  { email: 'groceryshop4@procurement.com', name: 'Kavitha Rao', store: 'Sri Sai Provision Store', branch: 'Rajajinagar Branch', address: 'Dr Rajkumar Road, Rajajinagar, Bengaluru', latitude: 13.0108, longitude: 77.5511 },
  { email: 'groceryshop5@procurement.com', name: 'Suresh Bhat', store: 'Neighborhood Grocers', branch: 'HSR Layout Branch', address: 'Sector 2, HSR Layout, Bengaluru', latitude: 12.9116, longitude: 77.6389 },
  { email: 'groceryshop6@procurement.com', name: 'Anita Shetty', store: 'Fresh Harvest Supermart', branch: 'Whitefield Branch', address: 'Hope Farm Junction, Whitefield, Bengaluru', latitude: 12.9698, longitude: 77.7499 },
  { email: 'groceryshop7@procurement.com', name: 'Deepak Kumar', store: 'Value Basket Store', branch: 'BTM Layout Branch', address: '2nd Stage, BTM Layout, Bengaluru', latitude: 12.9166, longitude: 77.6101 }
];

async function seedExtraGroceries() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const productIds = new Map();
    let insertedProducts = 0;
    let insertedListings = 0;

    for (const product of products) {
      const insertResult = await client.query(
        `INSERT INTO products (name, category, unit, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (name) DO NOTHING
         RETURNING id`,
        [product.name, product.category, product.unit, product.description]
      );
      insertedProducts += insertResult.rowCount;
      const productResult = await client.query(
        'SELECT id FROM products WHERE name = $1 AND is_active = TRUE',
        [product.name]
      );
      if (productResult.rows.length !== 1) {
        throw new Error(`Could not find active catalog product: ${product.name}`);
      }
      productIds.set(product.name, productResult.rows[0].id);
    }

    const passwordHash = await bcrypt.hash('pass123', 10);
    const shops = [];
    for (const [index, shop] of demoShops.entries()) {
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'Shopkeeper', $3)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [shop.email, passwordHash, shop.name]
      );
      let userId = userResult.rows[0]?.id;
      if (!userId) {
        const existingUser = await client.query(
          'SELECT id, role, is_active FROM users WHERE email = $1',
          [shop.email]
        );
        if (existingUser.rows.length !== 1 || existingUser.rows[0].role !== 'Shopkeeper' || !existingUser.rows[0].is_active) {
          throw new Error(`Demo shop account ${shop.email} exists but is not an active Shopkeeper.`);
        }
        userId = existingUser.rows[0].id;
      }

      await client.query(
        `INSERT INTO shopkeeper_profiles (user_id, store_name, branch, address, latitude, longitude)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, shop.store, shop.branch, shop.address, shop.latitude, shop.longitude]
      );
      shops.push({ ...shop, id: userId, index });
    }

    const existingDemoShops = await client.query(
      `SELECT u.id, u.email
       FROM users u
       JOIN shopkeeper_profiles sp ON sp.user_id = u.id
       WHERE u.email IN ('shopkeeper@procurement.com', 'shopkeeper2@procurement.com')
         AND u.is_active = TRUE`
    );
    for (const shop of existingDemoShops.rows) {
      const offerIndex = shop.email === 'shopkeeper@procurement.com' ? 0 : 1;
      for (const product of products) {
        if (!product.offers) continue;
        const [stock, price, , , expiryDays] = product.offers[offerIndex];
        const result = await client.query(
          `INSERT INTO shop_stock (shopkeeper_id, product_id, available_stock, unit_price, expiry_date)
           VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::integer)
           ON CONFLICT (shopkeeper_id, product_id) DO NOTHING`,
          [shop.id, productIds.get(product.name), stock, price, expiryDays]
        );
        insertedListings += result.rowCount;
      }
    }

    for (const shop of shops) {
      await client.query(
        `UPDATE shopkeeper_profiles
         SET latitude = COALESCE(latitude, $1),
             longitude = COALESCE(longitude, $2)
         WHERE user_id = $3`,
        [shop.latitude, shop.longitude, shop.id]
      );
    }

    const activeProducts = await client.query(
      `SELECT p.id, p.name, p.category, MIN(ss.unit_price)::numeric AS reference_price
       FROM products p
       LEFT JOIN shop_stock ss ON ss.product_id = p.id AND ss.available_stock > 0
       WHERE p.is_active = TRUE
       GROUP BY p.id, p.name, p.category
       ORDER BY p.id`
    );
    const productDetails = new Map(products.map((product) => [product.name, product]));
    const priceMultipliers = [0.98, 1.02, 0.95, 1.05, 1.01, 0.93, 1.08];
    const categoryPrices = {
      Vegetables: 40,
      Fruits: 70,
      Dairy: 65,
      Bakery: 45,
      'Dals & Pulses': 100,
      'Rice & Grains': 80,
      'Flours & Atta': 70,
      'Sugar & Salt': 45,
      'Spices & Masalas': 60,
      'Edible Oils & Ghee': 150,
      'Snacks & Breakfast': 70,
      'Beverages & Tea': 100
    };

    for (const product of activeProducts.rows) {
      const referencePrice = Number(product.reference_price)
        || productDetails.get(product.name)?.basePrice
        || categoryPrices[product.category]
        || 50;

      for (const shop of shops) {
        const stock = 20 + ((Number(product.id) + shop.index * 7) % 31);
        const price = Math.max(1, Math.round(referencePrice * priceMultipliers[shop.index] * 100) / 100);
        const result = await client.query(
          `INSERT INTO shop_stock (shopkeeper_id, product_id, available_stock, unit_price, expiry_date)
           VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::integer)
           ON CONFLICT (shopkeeper_id, product_id) DO NOTHING`,
          [shop.id, product.id, stock, price, 90 + shop.index * 7]
        );
        insertedListings += result.rowCount;
      }
    }

    await client.query('COMMIT');
    console.log(`Added ${insertedProducts} grocery products and ${insertedListings} listings across ${shops.length} demo shops. Existing rows were preserved.`);
    console.log('Demo shop accounts: groceryshop1@procurement.com through groceryshop7@procurement.com (password: pass123).');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedExtraGroceries().catch((error) => {
  console.error('Failed to add demo groceries:', error);
  process.exitCode = 1;
});
