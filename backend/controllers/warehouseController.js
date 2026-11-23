import pool from '../config/db.js';
import WorkflowEngine, { WORKFLOW_STATES } from '../modules/E1-Workflow/workflowEngine.js';

export const getIncomingOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        po.*,
        p.name AS product_name,
        p.category AS product_category,
        p.unit AS product_unit,
        v.full_name AS vendor_name,
        vp.company_name AS vendor_company,
        pr.request_code,
        grn.id AS grn_id,
        grn.grn_number,
        grn.received_quantity,
        grn.status AS grn_status
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       LEFT JOIN vendor_profiles vp ON v.id = vp.user_id
       JOIN purchase_requests pr ON po.request_id = pr.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       WHERE po.status IN ('Confirmed', 'Shipped')
       ORDER BY po.order_date DESC`
    );

    res.json({ success: true, incomingOrders: result.rows });
  } catch (err) {
    next(err);
  }
};

export const recordGoodsReceipt = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const warehouseUserId = req.user.id;
    const { poId, receivedQuantity, damagedQuantity = 0, missingQuantity = 0, remarks } = req.body;

    if (!poId || receivedQuantity === undefined) {
      return res.status(400).json({ success: false, message: 'poId and receivedQuantity are required.' });
    }

    const rQty = Number(receivedQuantity);
    const dQty = Number(damagedQuantity);
    const mQty = Number(missingQuantity);

    if (rQty < 0 || dQty < 0 || mQty < 0) {
      return res.status(400).json({ success: false, message: 'Quantities cannot be negative.' });
    }

    await client.query('BEGIN');

    // Fetch PO details with lock
    const poRes = await client.query(
      `SELECT po.*, p.name AS product_name, pr.id AS request_id, pr.customer_id, pr.request_code
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN purchase_requests pr ON po.request_id = pr.id
       WHERE po.id = $1 FOR UPDATE`,
      [poId]
    );

    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    const po = poRes.rows[0];

    // Check if GRN already exists
    const existingGrn = await client.query('SELECT id FROM goods_receipts WHERE po_id = $1', [poId]);
    if (existingGrn.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Goods receipt has already been logged for this purchase order.' });
    }

    // Determine GRN status
    let grnStatus = 'Full';
    if (dQty > 0 || mQty > 0 || rQty !== Number(po.quantity)) {
      grnStatus = 'Discrepancy';
    }

    const grnNumber = `GRN-${Date.now().toString().slice(-6)}`;

    // Create GRN
    const grnRes = await client.query(
      `INSERT INTO goods_receipts (
        grn_number, po_id, warehouse_id, ordered_quantity, received_quantity,
        damaged_quantity, missing_quantity, status, remarks, receipt_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *`,
      [grnNumber, poId, warehouseUserId, po.quantity, rQty, dQty, mQty, grnStatus, remarks || '']
    );

    const newGrn = grnRes.rows[0];

    // Update PO status to Received
    await client.query(`UPDATE purchase_orders SET status = 'Received' WHERE id = $1`, [poId]);

    // Update Request status to 'Received'
    await client.query(
      `UPDATE purchase_requests SET status = 'Received', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [po.request_id]
    );

    // Notify Shopkeeper
    await WorkflowEngine.sendNotification({
      recipientId: po.shopkeeper_id,
      eventType: 'GOODS_RECEIVED',
      title: 'Goods Received at Warehouse',
      message: `Warehouse recorded ${grnNumber} for ${po.po_number}: ${rQty} received, ${dQty} damaged, ${mQty} missing (Status: ${grnStatus}).`,
      relatedEntityType: 'goods_receipts',
      relatedEntityId: newGrn.id,
      client
    });

    // Notify Finance
    const finUsers = await client.query(`SELECT id FROM users WHERE role = 'Finance' AND is_active = TRUE`);
    for (const f of finUsers.rows) {
      await WorkflowEngine.sendNotification({
        recipientId: f.id,
        eventType: 'GOODS_RECEIPT_AVAILABLE',
        title: 'Goods Receipt Available for Reconciliation',
        message: `GRN ${grnNumber} for PO ${po.po_number} recorded by warehouse. Ready for 3-way matching.`,
        relatedEntityType: 'goods_receipts',
        relatedEntityId: newGrn.id,
        client
      });
    }

    await WorkflowEngine.logAudit({
      actorId: warehouseUserId,
      actorRole: 'Warehouse',
      action: 'RECORD_GOODS_RECEIPT',
      entityType: 'goods_receipts',
      entityId: newGrn.id,
      details: { grnNumber, poNumber: po.po_number, receivedQuantity: rQty, damagedQuantity: dQty, missingQuantity: mQty, status: grnStatus },
      client
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Goods Receipt ${grnNumber} recorded successfully.`,
      goodsReceipt: newGrn
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getAllReceipts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        grn.*,
        po.po_number,
        p.name AS product_name,
        p.category AS product_category,
        v.full_name AS vendor_name,
        w.full_name AS received_by_name
       FROM goods_receipts grn
       JOIN purchase_orders po ON grn.po_id = po.id
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       JOIN users w ON grn.warehouse_id = w.id
       WHERE grn.warehouse_id IS NOT NULL
       ORDER BY grn.receipt_date DESC`
    );

    res.json({ success: true, receipts: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getReceiptDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        grn.*,
        po.po_number,
        po.order_date,
        p.name AS product_name,
        p.category AS product_category,
        p.unit AS product_unit,
        v.full_name AS vendor_name,
        w.full_name AS received_by_name
       FROM goods_receipts grn
       JOIN purchase_orders po ON grn.po_id = po.id
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       JOIN users w ON grn.warehouse_id = w.id
       WHERE grn.id = $1 AND grn.warehouse_id IS NOT NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }

    res.json({ success: true, receipt: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getInventory = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.unit,
        COALESCE(SUM(grn.received_quantity), 0) AS total_received,
        COALESCE(SUM(grn.damaged_quantity), 0) AS total_damaged,
        COALESCE(SUM(grn.missing_quantity), 0) AS total_missing,
        COUNT(DISTINCT grn.id) AS total_receipts
       FROM products p
       LEFT JOIN purchase_orders po ON po.product_id = p.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id AND grn.warehouse_id IS NOT NULL
       GROUP BY p.id, p.name, p.category, p.unit
       ORDER BY p.name ASC`
    );

    res.json({ success: true, inventory: result.rows });
  } catch (err) {
    next(err);
  }
};
