import pool from '../config/db.js';
import IntegrityAndReconciliationEngine from '../modules/E3-Data-Transaction/integrityEngine.js';
import WorkflowEngine from '../modules/E1-Workflow/workflowEngine.js';

export const getPurchaseOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        po.*,
        p.name AS product_name,
        p.category AS product_category,
        v.full_name AS vendor_name,
        sk.full_name AS shopkeeper_name,
        pr.request_code,
        grn.id AS grn_id,
        grn.grn_number,
        grn.received_quantity,
        grn.status AS grn_status,
        receiver.full_name AS grn_received_by,
        CASE WHEN grn.shopkeeper_id IS NOT NULL THEN 'Shopkeeper' ELSE 'Warehouse' END AS grn_received_by_role,
        inv.id AS invoice_id,
        inv.invoice_number,
        inv.status AS invoice_status,
        inv.total_amount AS invoice_amount,
        rec.id AS reconciliation_id,
        rec.status AS reconciliation_status,
        rec.is_matched,
        pay.id AS payment_id,
        pay.payment_number,
        pay.status AS payment_status
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       JOIN users sk ON po.shopkeeper_id = sk.id
       JOIN purchase_requests pr ON po.request_id = pr.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       LEFT JOIN users receiver ON receiver.id = COALESCE(grn.warehouse_id, grn.shopkeeper_id)
       LEFT JOIN invoices inv ON inv.po_id = po.id
       LEFT JOIN LATERAL (
         SELECT rec.id, rec.status, rec.is_matched
         FROM reconciliations rec
         WHERE rec.po_id = po.id
         ORDER BY rec.reconciled_at DESC
         LIMIT 1
       ) rec ON TRUE
       LEFT JOIN payments pay ON pay.po_id = po.id
       ORDER BY po.created_at DESC`
    );

    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getGoodsReceipts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        grn.*,
        po.po_number,
        po.total_amount AS po_amount,
        p.name AS product_name,
        v.full_name AS vendor_name,
        receiver.full_name AS received_by_name,
        CASE WHEN grn.shopkeeper_id IS NOT NULL THEN 'Shopkeeper' ELSE 'Warehouse' END AS received_by_role
       FROM goods_receipts grn
       JOIN purchase_orders po ON grn.po_id = po.id
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       LEFT JOIN users receiver ON receiver.id = COALESCE(grn.warehouse_id, grn.shopkeeper_id)
       ORDER BY grn.receipt_date DESC`
    );

    res.json({ success: true, receipts: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        inv.*,
        po.po_number,
        po.total_amount AS po_amount,
        p.name AS product_name,
        v.full_name AS vendor_name,
        rec.id AS reconciliation_id,
        rec.is_matched,
        rec.status AS reconciliation_status,
        pay.id AS payment_id,
        pay.payment_number,
        pay.status AS payment_status
       FROM invoices inv
       JOIN purchase_orders po ON inv.po_id = po.id
       JOIN products p ON po.product_id = p.id
       JOIN users v ON inv.vendor_id = v.id
       LEFT JOIN reconciliations rec ON rec.invoice_id = inv.id
       LEFT JOIN payments pay ON pay.invoice_id = inv.id
       ORDER BY inv.created_at DESC`
    );

    res.json({ success: true, invoices: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getReconciliationPreview = async (req, res, next) => {
  try {
    const { poId } = req.params;

    const poRes = await pool.query(
      `SELECT po.*, p.name AS product_name, v.full_name AS vendor_name
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       WHERE po.id = $1`,
      [poId]
    );

    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
    }

    const grnRes = await pool.query(
      `SELECT grn.*, receiver.full_name AS received_by_name,
              CASE WHEN grn.shopkeeper_id IS NOT NULL THEN 'Shopkeeper' ELSE 'Warehouse' END AS received_by_role
       FROM goods_receipts grn
       LEFT JOIN users receiver ON receiver.id = COALESCE(grn.warehouse_id, grn.shopkeeper_id)
       WHERE grn.po_id = $1`,
      [poId]
    );
    const invRes = await pool.query('SELECT * FROM invoices WHERE po_id = $1', [poId]);
    const recRes = await pool.query(
      'SELECT * FROM reconciliations WHERE po_id = $1 ORDER BY reconciled_at DESC LIMIT 1',
      [poId]
    );

    res.json({
      success: true,
      purchaseOrder: poRes.rows[0],
      goodsReceipt: grnRes.rows[0] || null,
      invoice: invRes.rows[0] || null,
      existingReconciliation: recRes.rows[0] || null
    });
  } catch (err) {
    next(err);
  }
};

export const executeReconciliation = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const financeUserId = req.user.id;
    const { poId, grnId, invoiceId } = req.body;

    if (!poId || !grnId || !invoiceId) {
      return res.status(400).json({ success: false, message: 'poId, grnId, and invoiceId are all required for three-way reconciliation.' });
    }

    await client.query('BEGIN');

    // Run Engine 3 three-way reconciliation
    const result = await IntegrityAndReconciliationEngine.performThreeWayMatch(
      poId, grnId, invoiceId, financeUserId, client
    );

    const decisionMessage = result.isMatched
      ? `Finance matched the PO, GRN, and invoice for ${result.po.po_number}. Payment can now be approved and recorded.`
      : `Finance placed payment for ${result.po.po_number} on hold because the PO, GRN, and invoice do not match: ${result.discrepancies.join(' ')}`;
    for (const recipientId of [result.po.shopkeeper_id, result.po.vendor_id]) {
      await WorkflowEngine.sendNotification({
        recipientId,
        eventType: result.isMatched ? 'FINANCE_THREE_WAY_MATCH_PASSED' : 'FINANCE_PAYMENT_ON_HOLD',
        title: result.isMatched ? 'Finance matching review passed' : 'Finance placed payment on hold',
        message: decisionMessage,
        relatedEntityType: 'reconciliations',
        relatedEntityId: result.reconciliation.id,
        client
      });
    }
    await WorkflowEngine.logAudit({
      actorId: financeUserId,
      actorRole: 'Finance',
      action: result.isMatched ? 'THREE_WAY_MATCH_PASSED' : 'THREE_WAY_MATCH_HELD',
      entityType: 'reconciliations',
      entityId: result.reconciliation.id,
      details: {
        poId: result.po.id,
        grnId,
        invoiceId,
        isMatched: result.isMatched,
        discrepancies: result.discrepancies
      },
      ip: req.ip,
      client
    });

    await client.query('COMMIT');

    res.json({
      success: true,
      message: result.isMatched
        ? 'Three-way matching successful! Records match 100%. Ready for payment recording.'
        : 'Reconciliation completed with discrepancies. Payment is BLOCKED.',
      reconciliation: result.reconciliation,
      isMatched: result.isMatched,
      discrepancies: result.discrepancies
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getReconciliations = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        rec.*,
        po.po_number,
        grn.grn_number,
        inv.invoice_number,
        v.full_name AS vendor_name,
        p.name AS product_name,
        fin.full_name AS finance_officer_name,
        pay.payment_number,
        pay.status AS payment_status
       FROM reconciliations rec
       JOIN purchase_orders po ON rec.po_id = po.id
       JOIN goods_receipts grn ON rec.grn_id = grn.id
       JOIN invoices inv ON rec.invoice_id = inv.id
       JOIN users v ON po.vendor_id = v.id
       JOIN products p ON po.product_id = p.id
       JOIN users fin ON rec.finance_id = fin.id
       LEFT JOIN payments pay ON pay.reconciliation_id = rec.id
       ORDER BY rec.reconciled_at DESC`
    );

    res.json({ success: true, reconciliations: result.rows });
  } catch (err) {
    next(err);
  }
};

export const recordPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const financeUserId = req.user.id;
    const { reconciliationId, paymentMethod, referenceNumber } = req.body;

    if (!reconciliationId || !referenceNumber) {
      return res.status(400).json({ success: false, message: 'reconciliationId and referenceNumber are required.' });
    }

    await client.query('BEGIN');

    const payment = await IntegrityAndReconciliationEngine.recordPaymentAndComplete({
      reconciliationId,
      paymentMethod,
      referenceNumber,
      financeUserId,
      client
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Payment ${payment.payment_number} recorded successfully. Procurement workflow Completed!`,
      payment
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        pay.*,
        po.po_number,
        inv.invoice_number,
        v.full_name AS vendor_name,
        p.name AS product_name,
        fin.full_name AS processed_by
       FROM payments pay
       JOIN purchase_orders po ON pay.po_id = po.id
       JOIN invoices inv ON pay.invoice_id = inv.id
       JOIN users v ON po.vendor_id = v.id
       JOIN products p ON po.product_id = p.id
       JOIN users fin ON pay.finance_id = fin.id
       ORDER BY pay.payment_date DESC`
    );

    res.json({ success: true, payments: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getFinancialReports = async (req, res, next) => {
  try {
    // 1. Total procurement value
    const totalSpendRes = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM payments WHERE status = 'Completed'`
    );

    // 2. Pending reconciliation & payments
    const pendingInvoices = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total 
       FROM invoices WHERE status = 'Submitted'`
    );

    // 3. Reconciliations match stats
    const recStats = await pool.query(
      `SELECT 
        COUNT(*) AS total,
        COUNT(CASE WHEN is_matched = TRUE THEN 1 END) AS matched_count,
        COUNT(CASE WHEN is_matched = FALSE THEN 1 END) AS mismatch_count
       FROM reconciliations`
    );

    // 4. Spend by product category
    const spendByCategory = await pool.query(
      `SELECT p.category, COALESCE(SUM(pay.amount), 0) AS total_spend
       FROM payments pay
       JOIN purchase_orders po ON pay.po_id = po.id
       JOIN products p ON po.product_id = p.id
       WHERE pay.status = 'Completed'
       GROUP BY p.category`
    );

    // 5. Vendor payment distribution
    const spendByVendor = await pool.query(
      `SELECT v.full_name AS vendor_name, COALESCE(SUM(pay.amount), 0) AS total_amount
       FROM payments pay
       JOIN purchase_orders po ON pay.po_id = po.id
       JOIN users v ON po.vendor_id = v.id
       WHERE pay.status = 'Completed'
       GROUP BY v.full_name`
    );

    res.json({
      success: true,
      totalPaid: Number(totalSpendRes.rows[0].total_paid),
      pendingInvoicesCount: Number(pendingInvoices.rows[0].count),
      pendingInvoicesAmount: Number(pendingInvoices.rows[0].total),
      reconciliationStats: recStats.rows[0],
      spendByCategory: spendByCategory.rows,
      spendByVendor: spendByVendor.rows
    });
  } catch (err) {
    next(err);
  }
};
