import pool from '../config/db.js';
import ConcurrentStockEngine from '../modules/E4-Concurrent-Stock/stockEngine.js';

async function runConcurrencyTest() {
  console.log('================================================================');
  console.log('🧪 RUNNING ENGINE 4 CONCURRENCY & RACE CONDITION VERIFICATION');
  console.log('Scenario: Vendor has 10 units. Two users concurrently order 8 units.');
  console.log('Expected: 1 succeeds, 1 rejected, final stock is 2.');
  console.log('================================================================');

  const client = await pool.connect();
  let testVendorId;
  let testProductId;
  let req1Id;
  let req2Id;
  let shopkeeperId;

  try {
    // 1. Setup isolated test data in DB
    const pRes = await client.query(
      `INSERT INTO products (name, category, unit, description)
       VALUES ('Concurrency Test Rice Bag', 'Test Goods', 'Bags', 'Temporary item for race condition test')
       RETURNING id`
    );
    testProductId = pRes.rows[0].id;

    const uRes = await client.query(`SELECT id FROM users WHERE role = 'Vendor' LIMIT 1`);
    testVendorId = uRes.rows[0].id;

    const skRes = await client.query(`SELECT id FROM users WHERE role = 'Shopkeeper' LIMIT 1`);
    shopkeeperId = skRes.rows[0].id;

    const custRes = await client.query(`SELECT id FROM users WHERE role = 'Customer' LIMIT 1`);
    const customerId = custRes.rows[0].id;

    // Set stock to exactly 10 units
    await client.query(
      `INSERT INTO vendor_stock (vendor_id, product_id, available_stock, unit_price, lead_time_days)
       VALUES ($1, $2, 10, 100.00, 1)
       ON CONFLICT (vendor_id, product_id)
       DO UPDATE SET available_stock = 10, unit_price = 100.00`,
      [testVendorId, testProductId]
    );

    // Create 2 separate approved requests each requesting 8 units
    const r1 = await client.query(
      `INSERT INTO purchase_requests (request_code, customer_id, product_id, quantity, unit, status)
       VALUES ('TEST-REQ-A', $1, $2, 8, 'Bags', 'Approved') RETURNING id`,
      [customerId, testProductId]
    );
    req1Id = r1.rows[0].id;

    const r2 = await client.query(
      `INSERT INTO purchase_requests (request_code, customer_id, product_id, quantity, unit, status)
       VALUES ('TEST-REQ-B', $1, $2, 8, 'Bags', 'Approved') RETURNING id`,
      [customerId, testProductId]
    );
    req2Id = r2.rows[0].id;

    console.log(`Initial Setup: Product ID ${testProductId}, Vendor ID ${testVendorId}`);
    console.log(`Initial Available Stock: 10 bags`);
    console.log(`Launching 2 simultaneous orders of 8 bags each using Promise.all...`);

    // 2. Launch concurrent orders simultaneously
    const results = await Promise.allSettled([
      ConcurrentStockEngine.reserveStockAndCreatePO({
        requestId: req1Id,
        shopkeeperId,
        vendorId: testVendorId,
        productId: testProductId,
        quantity: 8
      }),
      ConcurrentStockEngine.reserveStockAndCreatePO({
        requestId: req2Id,
        shopkeeperId,
        vendorId: testVendorId,
        productId: testProductId,
        quantity: 8
      })
    ]);

    console.log('\n--- Concurrent Execution Results ---');
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    console.log(`Successful Orders: ${successes.length}`);
    console.log(`Rejected Orders:   ${failures.length}`);

    if (failures.length > 0) {
      console.log(`Rejection message: "${failures[0].reason.message}"`);
    }

    // 3. Inspect final stock in PostgreSQL
    const finalStockRes = await client.query(
      `SELECT available_stock FROM vendor_stock WHERE vendor_id = $1 AND product_id = $2`,
      [testVendorId, testProductId]
    );
    const finalStock = finalStockRes.rows[0].available_stock;
    console.log(`Final Available Stock in DB: ${finalStock} bags`);

    // 4. Assertions
    const testPassed = (successes.length === 1 && failures.length === 1 && finalStock === 2);

    if (testPassed) {
      console.log('\n✅ TEST PASSED: Row-Level Locking (SELECT ... FOR UPDATE) prevented race condition successfully!');
      console.log('✅ Exactly 1 order succeeded, exactly 1 order was blocked, and remaining stock is accurately 2 bags.');
    } else {
      console.error('\n❌ TEST FAILED: Race condition occurred or counts did not match expected values.');
      process.exit(1);
    }

  } catch (err) {
    console.error('Unexpected error in test:', err);
    process.exit(1);
  } finally {
    // Cleanup test data
    if (testProductId) {
      await client.query('DELETE FROM stock_reservations WHERE product_id = $1', [testProductId]);
      await client.query('DELETE FROM purchase_orders WHERE product_id = $1', [testProductId]);
      await client.query('DELETE FROM purchase_requests WHERE product_id = $1', [testProductId]);
      await client.query('DELETE FROM vendor_stock WHERE product_id = $1', [testProductId]);
      await client.query('DELETE FROM products WHERE id = $1', [testProductId]);
    }
    client.release();
    await pool.end();
  }
}

runConcurrencyTest();
