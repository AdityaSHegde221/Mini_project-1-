import pool from '../config/db.js';
import WorkflowEngine, { WORKFLOW_STATES } from '../modules/E1-Workflow/workflowEngine.js';

export const createRequest = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const customerId = req.user.id;
    const { productId, quantity, unit, description, requiredDate } = req.body;

    if (!productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid product and positive quantity are required.' });
    }

    // Verify product exists
    const prodRes = await client.query('SELECT id, name FROM products WHERE id = $1 AND is_active = TRUE', [productId]);
    if (prodRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Specified product does not exist.' });
    }

    await client.query('BEGIN');

    const requestCode = `REQ-${Date.now().toString().slice(-6)}`;

    const insertRes = await client.query(
      `INSERT INTO purchase_requests (request_code, customer_id, product_id, quantity, unit, description, required_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
       RETURNING *`,
      [requestCode, customerId, productId, quantity, unit || 'Pcs', description || '', requiredDate || null]
    );

    const newRequest = insertRes.rows[0];

    // Notify all active shopkeepers of incoming customer request
    const shopkeepers = await client.query(`SELECT id FROM users WHERE role = 'Shopkeeper' AND is_active = TRUE`);
    for (const sk of shopkeepers.rows) {
      await WorkflowEngine.sendNotification({
        recipientId: sk.id,
        eventType: 'NEW_PURCHASE_REQUEST',
        title: 'New Customer Purchase Request',
        message: `Customer ${req.user.full_name} submitted request ${requestCode} for ${quantity} ${unit || 'Pcs'} of ${prodRes.rows[0].name}.`,
        relatedEntityType: 'purchase_requests',
        relatedEntityId: newRequest.id,
        client
      });
    }

    await WorkflowEngine.logAudit({
      actorId: customerId,
      actorRole: 'Customer',
      action: 'CREATE_PURCHASE_REQUEST',
      entityType: 'purchase_requests',
      entityId: newRequest.id,
      details: { requestCode, productId, quantity, productName: prodRes.rows[0].name },
      client
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Purchase request ${requestCode} submitted successfully.`,
      request: newRequest
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getMyRequests = async (req, res, next) => {
  try {
    const customerId = req.user.id;

    const result = await pool.query(
      `SELECT 
        pr.*,
        p.name AS product_name,
        p.category AS product_category,
        v.full_name AS vendor_name,
        po.po_number,
        po.total_amount AS order_amount,
        grn.grn_number,
        grn.received_quantity,
        pay.payment_number,
        ra.decision AS approval_decision,
        ra.reason AS approval_reason
       FROM purchase_requests pr
       JOIN products p ON pr.product_id = p.id
       LEFT JOIN users v ON pr.selected_vendor_id = v.id
       LEFT JOIN purchase_orders po ON po.request_id = pr.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       LEFT JOIN payments pay ON pay.po_id = po.id
       LEFT JOIN request_approvals ra ON ra.request_id = pr.id
       WHERE pr.customer_id = $1
       ORDER BY pr.created_at DESC`,
      [customerId]
    );

    res.json({
      success: true,
      requests: result.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getRequestDetails = async (req, res, next) => {
  try {
    const customerId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        pr.*,
        p.name AS product_name,
        p.category AS product_category,
        v.full_name AS vendor_name,
        po.id AS po_id,
        po.po_number,
        po.total_amount AS order_amount,
        po.status AS po_status,
        grn.grn_number,
        grn.status AS grn_status,
        grn.received_quantity,
        pay.payment_number,
        pay.payment_date,
        ra.decision AS approval_decision,
        ra.reason AS approval_reason,
        ra.decided_at
       FROM purchase_requests pr
       JOIN products p ON pr.product_id = p.id
       LEFT JOIN users v ON pr.selected_vendor_id = v.id
       LEFT JOIN purchase_orders po ON po.request_id = pr.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       LEFT JOIN payments pay ON pay.po_id = po.id
       LEFT JOIN request_approvals ra ON ra.request_id = pr.id
       WHERE pr.id = $1 AND pr.customer_id = $2`,
      [id, customerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found or access denied.' });
    }

    res.json({
      success: true,
      request: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.category, p.unit, p.description
       FROM products p
       WHERE p.is_active = TRUE
         AND EXISTS (
           SELECT 1
           FROM shop_stock ss
           JOIN users shop ON shop.id = ss.shopkeeper_id AND shop.is_active = TRUE
           WHERE ss.product_id = p.id AND ss.available_stock > 0
         )
       ORDER BY p.name ASC`
    );
    res.json({ success: true, products: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getProductOffers = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid product is required.' });
    }

    const productResult = await pool.query(
      `SELECT id, name, category, unit, description
       FROM products
       WHERE id = $1 AND is_active = TRUE`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const offersResult = await pool.query(
      `SELECT
        ss.id,
        ss.shopkeeper_id,
        sp.store_name,
        sp.branch,
        sp.address,
        sp.latitude,
        sp.longitude,
        ss.available_stock,
        ss.unit_price,
        TO_CHAR(ss.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        (ss.expiry_date < CURRENT_DATE) AS is_expired,
        ss.updated_at
       FROM shop_stock ss
       JOIN shopkeeper_profiles sp ON sp.user_id = ss.shopkeeper_id
       JOIN users shop ON shop.id = ss.shopkeeper_id AND shop.is_active = TRUE
       WHERE ss.product_id = $1 AND ss.available_stock > 0
       ORDER BY ss.unit_price ASC, ss.expiry_date ASC`,
      [productId]
    );

    res.json({
      success: true,
      product: productResult.rows[0],
      offers: offersResult.rows
    });
  } catch (err) {
    next(err);
  }
};
