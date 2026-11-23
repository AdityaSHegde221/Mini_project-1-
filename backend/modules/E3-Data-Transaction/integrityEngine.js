import pool from '../../config/db.js';
import WorkflowEngine, { WORKFLOW_STATES } from '../E1-Workflow/workflowEngine.js';

export class IntegrityAndReconciliationEngine {
  /**
   * Performs automated 3-Way Matching across Purchase Order, Goods Receipt (GRN), and Vendor Invoice.
   */
  static async performThreeWayMatch(poId, grnId, invoiceId, financeUserId, client = pool) {
    // 1. Fetch Purchase Order
    const poRes = await client.query(
      `SELECT po.*, p.name AS product_name, v.full_name AS vendor_name
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       WHERE po.id = $1`,
      [poId]
    );
    if (poRes.rows.length === 0) {
      const err = new Error('Purchase Order not found for reconciliation.');
      err.statusCode = 404;
      throw err;
    }
    const po = poRes.rows[0];

    // 2. Fetch Goods Receipt (GRN)
    const grnRes = await client.query(
      `SELECT grn.*, receiver.full_name AS receiver_name,
              CASE WHEN grn.shopkeeper_id IS NOT NULL THEN 'Shopkeeper' ELSE 'Warehouse' END AS receiver_role
       FROM goods_receipts grn
       LEFT JOIN users receiver ON receiver.id = COALESCE(grn.warehouse_id, grn.shopkeeper_id)
       WHERE grn.id = $1 AND grn.po_id = $2`,
      [grnId, poId]
    );
    if (grnRes.rows.length === 0) {
      const err = new Error('Goods Receipt Note (GRN) not found or does not link to this Purchase Order.');
      err.statusCode = 404;
      throw err;
    }
    const grn = grnRes.rows[0];

    // 3. Fetch Vendor Invoice
    const invRes = await client.query(
      `SELECT inv.*, v.full_name AS invoice_vendor_name
       FROM invoices inv
       JOIN users v ON inv.vendor_id = v.id
       WHERE inv.id = $1 AND inv.po_id = $2`,
      [invoiceId, poId]
    );
    if (invRes.rows.length === 0) {
      const err = new Error('Vendor Invoice not found or does not link to this Purchase Order.');
      err.statusCode = 404;
      throw err;
    }
    const inv = invRes.rows[0];

    // 4. Detailed comparison checks
    const discrepancies = [];

    // Check Vendor identity
    if (Number(po.vendor_id) !== Number(inv.vendor_id)) {
      discrepancies.push(`Vendor mismatch: PO vendor ID (${po.vendor_id}) does not match Invoice vendor ID (${inv.vendor_id}).`);
    }

    // Check Quantity (PO ordered vs GRN received vs Invoice billed)
    if (Number(po.quantity) !== Number(inv.quantity)) {
      discrepancies.push(`Quantity mismatch: PO requested ${po.quantity} units, but Invoice billed for ${inv.quantity} units.`);
    }

    if (Number(grn.received_quantity) !== Number(po.quantity)) {
      discrepancies.push(`Receipt mismatch: ${grn.receiver_role} reported ${grn.received_quantity} units out of ${po.quantity} ordered units.`);
    }

    if (Number(grn.damaged_quantity) > 0) {
      discrepancies.push(`Damage alert: ${grn.receiver_role} reported ${grn.damaged_quantity} damaged units.`);
    }

    if (Number(grn.missing_quantity) > 0) {
      discrepancies.push(`Shortage alert: ${grn.receiver_role} reported ${grn.missing_quantity} missing units.`);
    }

    // Check Amounts
    const poTotal = Number(po.total_amount);
    const invTotal = Number(inv.total_amount);
    const amountDifference = Math.abs(poTotal - invTotal);

    if (amountDifference > 0.01) {
      discrepancies.push(`Amount mismatch: PO total is ₹${poTotal.toFixed(2)}, but Invoice total is ₹${invTotal.toFixed(2)} (Difference: ₹${amountDifference.toFixed(2)}).`);
    }

    const isMatched = discrepancies.length === 0;
    const recNumber = `REC-${Date.now().toString().slice(-6)}`;
    const status = isMatched ? 'Approved' : 'Mismatch';
    const discrepancyDetails = isMatched
      ? 'All three records (PO, GRN, and Invoice) matched perfectly across quantities, pricing, and vendors.'
      : discrepancies.join(' | ');

    // Save reconciliation record in DB
    const insertRes = await client.query(
      `INSERT INTO reconciliations (
        rec_number, po_id, grn_id, invoice_id, finance_id, is_matched,
        po_amount, invoice_amount, po_quantity, grn_quantity, invoice_quantity,
        discrepancy_details, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        recNumber, poId, grnId, invoiceId, financeUserId, isMatched,
        poTotal, invTotal, po.quantity, grn.received_quantity, inv.quantity,
        discrepancyDetails, status
      ]
    );

    return {
      reconciliation: insertRes.rows[0],
      isMatched,
      status,
      discrepancies,
      po,
      grn,
      invoice: inv
    };
  }

  /**
   * Process and record payment for an approved reconciliation.
   * If reconciliation is not matched or is mismatched, payment is strictly blocked.
   */
  static async recordPaymentAndComplete({
    reconciliationId, paymentMethod, referenceNumber, financeUserId, client
  }) {
    // 1. Verify reconciliation record
    const recRes = await client.query(
      `SELECT r.*, po.request_id, po.vendor_id, po.shopkeeper_id, po.po_number, inv.invoice_number, req.customer_id
       FROM reconciliations r
       JOIN purchase_orders po ON r.po_id = po.id
       JOIN purchase_requests req ON po.request_id = req.id
       JOIN invoices inv ON r.invoice_id = inv.id
       WHERE r.id = $1`,
      [reconciliationId]
    );

    if (recRes.rows.length === 0) {
      const err = new Error('Reconciliation record not found.');
      err.statusCode = 404;
      throw err;
    }

    const rec = recRes.rows[0];

    // BLOCK PAYMENT ON MISMATCH
    if (!rec.is_matched || rec.status !== 'Approved') {
      const err = new Error(
        `PAYMENT BLOCKED: Three-way reconciliation failed. Discrepancies exist: ${rec.discrepancy_details}`
      );
      err.statusCode = 400;
      throw err;
    }

    // Check if payment already made
    const existingPay = await client.query(
      'SELECT id FROM payments WHERE reconciliation_id = $1',
      [reconciliationId]
    );
    if (existingPay.rows.length > 0) {
      const err = new Error('Payment has already been processed for this reconciliation.');
      err.statusCode = 400;
      throw err;
    }

    const paymentNumber = `PAY-${Date.now().toString().slice(-6)}`;

    // 2. Insert Payment Record
    const payRes = await client.query(
      `INSERT INTO payments (payment_number, reconciliation_id, invoice_id, po_id, finance_id, amount, payment_method, reference_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Completed')
       RETURNING *`,
      [paymentNumber, reconciliationId, rec.invoice_id, rec.po_id, financeUserId, rec.invoice_amount, paymentMethod || 'Corporate NEFT Transfer', referenceNumber]
    );

    // 3. Update Invoice status to 'Paid'
    await client.query(
      `UPDATE invoices SET status = 'Paid' WHERE id = $1`,
      [rec.invoice_id]
    );

    // 4. Update Request status to 'Completed'
    await client.query(
      `UPDATE purchase_requests SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [rec.request_id]
    );

    // 5. Notify Customer, Shopkeeper, and Vendor
    await WorkflowEngine.sendNotification({
      recipientId: rec.customer_id,
      eventType: 'REQUEST_COMPLETED',
      title: 'Order Fulfilled & Completed',
      message: `Your purchase request has been completely fulfilled, verified, and closed. Thank you!`,
      relatedEntityType: 'purchase_requests',
      relatedEntityId: rec.request_id,
      client
    });

    await WorkflowEngine.sendNotification({
      recipientId: rec.shopkeeper_id,
      eventType: 'PAYMENT_RECORDED',
      title: 'Order Payment Settled',
      message: `Finance completed reconciliation and recorded payment ₹${Number(rec.invoice_amount).toFixed(2)} for ${rec.po_number}. Request is now Completed.`,
      relatedEntityType: 'purchase_orders',
      relatedEntityId: rec.po_id,
      client
    });

    await WorkflowEngine.sendNotification({
      recipientId: rec.vendor_id,
      eventType: 'PAYMENT_RECEIVED',
      title: 'Invoice Payment Dispatched',
      message: `Payment of ₹${Number(rec.invoice_amount).toFixed(2)} for Invoice ${rec.invoice_number} has been recorded (Ref: ${referenceNumber}).`,
      relatedEntityType: 'invoices',
      relatedEntityId: rec.invoice_id,
      client
    });

    // 6. Write Audit Log
    await WorkflowEngine.logAudit({
      actorId: financeUserId,
      actorRole: 'Finance',
      action: 'RECORD_PAYMENT',
      entityType: 'payments',
      entityId: payRes.rows[0].id,
      details: {
        paymentNumber,
        amount: rec.invoice_amount,
        referenceNumber,
        poId: rec.po_id,
        requestId: rec.request_id
      },
      client
    });

    return payRes.rows[0];
  }
}

export default IntegrityAndReconciliationEngine;
