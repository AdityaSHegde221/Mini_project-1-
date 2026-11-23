import pool from '../config/db.js';
import WorkflowEngine, { WORKFLOW_STATES } from '../modules/E1-Workflow/workflowEngine.js';
import VendorDecisionEngine from '../modules/E2-Vendor-Selection/vendorEngine.js';
import IntegrityAndReconciliationEngine from '../modules/E3-Data-Transaction/integrityEngine.js';
import ConcurrentStockEngine from '../modules/E4-Concurrent-Stock/stockEngine.js';

async function runE2EWorkflowTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING MANDATORY END-TO-END WORKFLOW INTEGRATION TESTS');
  console.log('================================================================');

  const client = await pool.connect();

  try {
    // Lookup demo users
    const usersRes = await client.query('SELECT id, email, role, full_name FROM users');
    const uMap = {};
    usersRes.rows.forEach(u => { uMap[u.role] = u; });

    const customer = uMap['Customer'];
    const shopkeeper = uMap['Shopkeeper'];
    const warehouse = uMap['Warehouse'];
    const finance = uMap['Finance'];

    // Lookup Mechanical Keyboard product
    const prodRes = await client.query("SELECT id, name FROM products WHERE name ILIKE '%Keyboard%' LIMIT 1");
    const keyboard = prodRes.rows[0];

    console.log(`\n--- Test 1: Customer to Shopkeeper Workflow ---`);
    // Customer creates request for 20 keyboards
    const reqCode = `E2E-REQ-${Date.now().toString().slice(-4)}`;
    const insReq = await client.query(
      `INSERT INTO purchase_requests (request_code, customer_id, product_id, quantity, unit, description, status)
       VALUES ($1, $2, $3, 20, 'Pcs', 'E2E Test Requisition for 20 Keyboards', 'Pending') RETURNING *`,
      [reqCode, customer.id, keyboard.id]
    );
    const request = insReq.rows[0];
    console.log(`1. Customer created request: ${request.request_code} (Status: ${request.status})`);

    // Shopkeeper approves
    WorkflowEngine.validateTransition(request.status, WORKFLOW_STATES.APPROVED);
    await client.query(
      `UPDATE purchase_requests SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [request.id]
    );
    await client.query(
      `INSERT INTO request_approvals (request_id, shopkeeper_id, decision, reason)
       VALUES ($1, $2, 'Approved', 'E2E Automated test approval')`,
      [request.id, shopkeeper.id]
    );
    console.log(`2. Shopkeeper approved request -> Status updated to Approved.`);

    console.log(`\n--- Test 2 & 3: Single-Vendor Selection & Price Recommendation (20 Keyboards) ---`);
    const evalResult = await VendorDecisionEngine.evaluateVendors(keyboard.id, 20, client);
    console.log(`Total Vendors evaluated: ${evalResult.totalVendors}`);
    console.log(`Eligible Vendors (stock >= 20): ${evalResult.eligibleCount}`);

    // Print comparison table to console
    evalResult.vendors.forEach(v => {
      console.log(`   Vendor: ${v.vendor_name.padEnd(25)} | Stock: ${String(v.available_stock).padStart(2)} | Unit: ₹${Number(v.unit_price).toFixed(2)} | Eligible: ${v.is_eligible ? 'YES' : 'NO'} | Rec: ${v.is_recommended ? '★ RECOMMENDED' : '-'}`);
    });

    const recommended = evalResult.vendors.find(v => v.is_recommended);
    if (!recommended) {
      throw new Error('No recommended vendor identified!');
    }
    console.log(`Recommended Vendor: ${recommended.vendor_name} (Lowest price among eligible)`);

    console.log(`\n--- Test 4: Vendor Stock Lock & PO Confirmation (Engine 4) ---`);
    const orderResult = await ConcurrentStockEngine.reserveStockAndCreatePO({
      requestId: request.id,
      shopkeeperId: shopkeeper.id,
      vendorId: recommended.vendor_id,
      productId: keyboard.id,
      quantity: 20
    });
    const po = orderResult.purchaseOrder;
    console.log(`Confirmed Purchase Order: ${po.po_number} (Total Amount: ₹${Number(po.total_amount).toFixed(2)})`);
    console.log(`Remaining stock for vendor: ${orderResult.remainingStock} units`);

    console.log(`\n--- Test 5: Warehouse Goods Receipt Note (GRN) ---`);
    const grnCode = `E2E-GRN-${Date.now().toString().slice(-4)}`;
    const insGrn = await client.query(
      `INSERT INTO goods_receipts (grn_number, po_id, warehouse_id, ordered_quantity, received_quantity, damaged_quantity, missing_quantity, status, remarks)
       VALUES ($1, $2, $3, 20, 20, 0, 0, 'Full', 'All 20 keyboards inspected intact') RETURNING *`,
      [grnCode, po.id, warehouse.id]
    );
    const grn = insGrn.rows[0];
    await client.query(`UPDATE purchase_orders SET status = 'Received' WHERE id = $1`, [po.id]);
    await client.query(`UPDATE purchase_requests SET status = 'Received' WHERE id = $1`, [request.id]);
    console.log(`Logged GRN: ${grn.grn_number} (Received: ${grn.received_quantity}/20 units, Status: ${grn.status})`);

    console.log(`\n--- Test 6: Vendor Digital Invoice & Three-Way Reconciliation (Engine 3) ---`);
    // Vendor submits invoice
    const invCode = `E2E-INV-${Date.now().toString().slice(-4)}`;
    const insInv = await client.query(
      `INSERT INTO invoices (invoice_number, po_id, vendor_id, quantity, unit_price, total_amount, status)
       VALUES ($1, $2, $3, 20, $4, $5, 'Submitted') RETURNING *`,
      [invCode, po.id, recommended.vendor_id, po.unit_price, po.total_amount]
    );
    const inv = insInv.rows[0];
    console.log(`Submitted Invoice: ${inv.invoice_number} (Amount: ₹${Number(inv.total_amount).toFixed(2)})`);

    // Finance executes 3-way match
    const matchResult = await IntegrityAndReconciliationEngine.performThreeWayMatch(
      po.id, grn.id, inv.id, finance.id, client
    );
    console.log(`Reconciliation Result: ${matchResult.status} (Matched: ${matchResult.isMatched})`);
    if (!matchResult.isMatched) {
      throw new Error(`Reconciliation unexpectedly failed: ${matchResult.discrepancies.join(', ')}`);
    }

    console.log(`\n--- Test 7: Mismatch Testing & Payment Blocking Verification ---`);
    // Create mismatch invoice to test payment blocking
    const mismatchInvCode = `E2E-MISMATCH-${Date.now().toString().slice(-4)}`;
    const insMismatchInv = await client.query(
      `INSERT INTO invoices (invoice_number, po_id, vendor_id, quantity, unit_price, total_amount, status)
       VALUES ($1, $2, $3, 25, 999.00, 24975.00, 'Submitted') RETURNING *`,
      [mismatchInvCode, po.id, recommended.vendor_id]
    );
    const mismatchMatch = await IntegrityAndReconciliationEngine.performThreeWayMatch(
      po.id, grn.id, insMismatchInv.rows[0].id, finance.id, client
    );
    console.log(`Mismatch Test Status: ${mismatchMatch.status} (Matched: ${mismatchMatch.isMatched})`);
    console.log(`Expected Discrepancies detected: "${mismatchMatch.discrepancies.join(' | ')}"`);

    // Verify payment is strictly blocked on mismatch
    let blockedCaught = false;
    try {
      await IntegrityAndReconciliationEngine.recordPaymentAndComplete({
        reconciliationId: mismatchMatch.reconciliation.id,
        paymentMethod: 'Test Transfer',
        referenceNumber: 'TEST-FAIL-REF',
        financeUserId: finance.id,
        client
      });
    } catch (err) {
      blockedCaught = true;
      console.log(`✅ Success: Engine 3 correctly BLOCKED payment on mismatch: "${err.message}"`);
    }

    if (!blockedCaught) {
      throw new Error('Payment was NOT blocked on mismatch!');
    }

    console.log(`\n--- Test 8: Final Payment Disbursal & Workflow Completion ---`);
    const payment = await IntegrityAndReconciliationEngine.recordPaymentAndComplete({
      reconciliationId: matchResult.reconciliation.id,
      paymentMethod: 'Corporate RTGS Settlement',
      referenceNumber: 'RTGS-E2E-SETTLE-001',
      financeUserId: finance.id,
      client
    });
    console.log(`Payment Disbursed: ${payment.payment_number} (₹${Number(payment.amount).toFixed(2)})`);

    // Verify final status in PostgreSQL
    const finalReq = await client.query('SELECT status FROM purchase_requests WHERE id = $1', [request.id]);
    console.log(`Final Purchase Request Status in DB: ${finalReq.rows[0].status}`);

    if (finalReq.rows[0].status === 'Completed') {
      console.log(`\n🎉 ALL 8 MANDATORY INTEGRATION SCENARIOS PASSED WITH 100% SUCCESS!`);
    } else {
      throw new Error('Request status did not transition to Completed!');
    }

  } catch (err) {
    console.error('❌ E2E Integration test failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runE2EWorkflowTests();
