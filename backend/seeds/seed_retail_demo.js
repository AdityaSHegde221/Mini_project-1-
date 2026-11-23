import pool from '../config/db.js';

const offers = [
  ['Aashirvaad Shubh Shanti Chakki Atta (10 kg)', 16, 455.00, 24, 449.00],
  ['India Gate Classic Basmati Rice (5 kg)', 18, 565.00, 12, 559.00],
  ['Sona Masoori Karnataka Raw Rice (25 kg Bag)', 20, 1320.00, 16, 1299.00],
  ['Tata Sampann Unpolished Toor Dal (1 kg)', 30, 165.00, 25, 162.00],
  ['Tata Sampann Premium Chana Dal (1 kg)', 24, 159.00, 20, 155.00],
  ['Tata Sampann Green Moong Dal (1 kg)', 18, 165.00, 22, 159.00],
  ['Fortune Sunlite Refined Sunflower Oil (5 L Jar)', 14, 675.00, 18, 669.00],
  ['Fortune Kachi Ghani Pure Mustard Oil (1 L)', 14, 180.00, 16, 175.00],
  ['Amul Pure Desi Ghee (1 L Tin)', 10, 615.00, 12, 609.00],
  ['Madhur Pure Sulphurless Sugar (5 kg)', 22, 249.00, 30, 245.00],
  ['Tata Salt Vacuum Evaporated Iodized Salt (1 kg)', 32, 25.00, 40, 23.00],
  ['Everest Turmeric Powder / Haldi (500 g)', 16, 115.00, 20, 109.00],
  ['Everest Tikhalal Red Chilli Powder (500 g)', 14, 165.00, 18, 159.00],
  ['MDH Super Garam Masala (100 g)', 20, 95.00, 22, 91.00],
  ['Catch Whole Cumin Seeds / Jeera (200 g)', 20, 80.00, 18, 76.00],
  ['Brooke Bond Red Label Strong CTC Tea (500 g)', 12, 275.00, 18, 269.00],
  ['Nescafe Classic 100% Pure Instant Coffee (100 g Jar)', 10, 399.00, 12, 389.00],
  ['Parle-G Gold Biscuits (1 kg Family Pack)', 18, 120.00, 22, 115.00],
  ['Maggi 2-Minute Masala Instant Noodles (12-Pack Value Pack)', 16, 168.00, 20, 159.00],
  ['Haldiram Nagpur Classic Bhujia Sev (400 g)', 14, 120.00, 18, 115.00]
];

async function seedRetailDemo() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const shopResult = await client.query(
      `SELECT u.id, u.email
       FROM users u
       JOIN shopkeeper_profiles sp ON sp.user_id = u.id
       WHERE u.email IN ('shopkeeper@procurement.com', 'shopkeeper2@procurement.com')
       ORDER BY u.email`
    );
    if (shopResult.rows.length !== 2) {
      throw new Error('Both demo shopkeeper accounts must exist before adding demo retail offers.');
    }
    const firstShopId = shopResult.rows.find((shop) => shop.email === 'shopkeeper@procurement.com').id;
    const secondShopId = shopResult.rows.find((shop) => shop.email === 'shopkeeper2@procurement.com').id;

    const productNames = offers.map(([name]) => name);
    const productResult = await client.query(
      'SELECT id, name FROM products WHERE name = ANY($1::text[])',
      [productNames]
    );
    if (productResult.rows.length !== productNames.length) {
      throw new Error('The complete demo grocery catalog must exist before adding demo retail offers.');
    }

    const productIds = new Map(productResult.rows.map((product) => [product.name, product.id]));
    const locations = [
      [firstShopId, 12.9436, 77.5689],
      [secondShopId, 13.0068, 77.5697]
    ];

    for (const [shopkeeperId, latitude, longitude] of locations) {
      await client.query(
        `UPDATE shopkeeper_profiles
         SET latitude = COALESCE(latitude, $1),
             longitude = COALESCE(longitude, $2)
         WHERE user_id = $3`,
        [latitude, longitude, shopkeeperId]
      );
    }

    let insertedOffers = 0;
    for (const [name, firstStock, firstPrice, secondStock, secondPrice] of offers) {
      const productId = productIds.get(name);
      const values = [
        [firstShopId, firstStock, firstPrice, 180],
        [secondShopId, secondStock, secondPrice, 210]
      ];

      for (const [shopkeeperId, stock, price, expiryInDays] of values) {
        const result = await client.query(
          `INSERT INTO shop_stock (shopkeeper_id, product_id, available_stock, unit_price, expiry_date)
           VALUES ($1, $2, $3, $4, CURRENT_DATE + $5::integer)
           ON CONFLICT (shopkeeper_id, product_id) DO NOTHING`,
          [shopkeeperId, productId, stock, price, expiryInDays]
        );
        insertedOffers += result.rowCount;
      }
    }

    await client.query('COMMIT');
    console.log(`Added ${insertedOffers} demo shop offers. Existing listings were preserved.`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seedRetailDemo().catch((err) => {
  console.error('Failed to seed demo retail offers:', err);
  process.exitCode = 1;
});
