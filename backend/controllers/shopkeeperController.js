import { randomUUID } from 'node:crypto';
import pool from '../config/db.js';
import WorkflowEngine, { WORKFLOW_STATES } from '../modules/E1-Workflow/workflowEngine.js';
import VendorDecisionEngine from '../modules/E2-Vendor-Selection/vendorEngine.js';
import ConcurrentStockEngine from '../modules/E4-Concurrent-Stock/stockEngine.js';

export const getAllRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    let queryText = `
      SELECT 
        pr.*,
        p.name AS product_name,
        p.category AS product_category,
        u.full_name AS customer_name,
        u.email AS customer_email,
        cp.organization,
        v.full_name AS selected_vendor_name,
        ra.decision AS approval_decision,
        ra.reason AS approval_reason,
        po.id AS po_id,
        po.po_number
      FROM purchase_requests pr
      JOIN products p ON pr.product_id = p.id
      JOIN users u ON pr.customer_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      LEFT JOIN users v ON pr.selected_vendor_id = v.id
      LEFT JOIN request_approvals ra ON ra.request_id = pr.id
      LEFT JOIN purchase_orders po ON po.request_id = pr.id
    `;

    const params = [];
    if (status && status !== 'All') {
      queryText += ' WHERE pr.status = $1';
      params.push(status);
    }

    queryText += ' ORDER BY pr.created_at DESC';

    const result = await pool.query(queryText, params);
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getRequestDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const reqRes = await pool.query(
      `SELECT 
        pr.*,
        p.name AS product_name,
        p.category AS product_category,
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        cp.organization,
        cp.address AS customer_address,
        cp.department AS customer_department,
        v.full_name AS selected_vendor_name,
        ra.decision AS approval_decision,
        ra.reason AS approval_reason,
        ra.decided_at,
        po.id AS po_id,
        po.po_number,
        po.status AS po_status
      FROM purchase_requests pr
      JOIN products p ON pr.product_id = p.id
      JOIN users u ON pr.customer_id = u.id
      LEFT JOIN customer_profiles cp ON u.id = cp.user_id
      LEFT JOIN users v ON pr.selected_vendor_id = v.id
      LEFT JOIN request_approvals ra ON ra.request_id = pr.id
      LEFT JOIN purchase_orders po ON po.request_id = pr.id
      WHERE pr.id = $1`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase request not found.' });
    }

    // Get enquiries associated with this request
    const enqRes = await pool.query(
      `SELECT ve.*, v.full_name AS vendor_name, ver.quoted_price, ver.available_quantity, ver.comments, ver.status AS response_status
       FROM vendor_enquiries ve
       JOIN users v ON ve.vendor_id = v.id
       LEFT JOIN vendor_enquiry_responses ver ON ver.enquiry_id = ve.id
       WHERE ve.request_id = $1 ORDER BY ve.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      request: reqRes.rows[0],
      enquiries: enqRes.rows
    });
  } catch (err) {
    next(err);
  }
};

export const approveRequest = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const shopkeeperId = req.user.id;

    await client.query('BEGIN');

    const reqRes = await client.query(
      `SELECT id, request_code, customer_id, status FROM purchase_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = reqRes.rows[0];

    // Validate state transition (Pending -> Approved)
    WorkflowEngine.validateTransition(request.status, WORKFLOW_STATES.APPROVED);

    // Record approval
    await client.query(
      `INSERT INTO request_approvals (request_id, shopkeeper_id, decision, reason)
       VALUES ($1, $2, 'Approved', $3)`,
      [id, shopkeeperId, reason || 'Request approved by store manager.']
    );

    // Update request status
    await client.query(
      `UPDATE purchase_requests SET status = 'Approved', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    // Notify customer
    await WorkflowEngine.sendNotification({
      recipientId: request.customer_id,
      eventType: 'REQUEST_APPROVED',
      title: 'Purchase Request Approved',
      message: `Your purchase request ${request.request_code} has been approved. Shopkeeper is initiating vendor selection.`,
      relatedEntityType: 'purchase_requests',
      relatedEntityId: id,
      client
    });

    await WorkflowEngine.logAudit({
      actorId: shopkeeperId,
      actorRole: 'Shopkeeper',
      action: 'APPROVE_REQUEST',
      entityType: 'purchase_requests',
      entityId: id,
      details: { requestCode: request.request_code, reason },
      client
    });

    await client.query('COMMIT');

    res.json({ success: true, message: `Request ${request.request_code} approved successfully.` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const rejectRequest = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const shopkeeperId = req.user.id;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a reason for rejection.' });
    }

    await client.query('BEGIN');

    const reqRes = await client.query(
      `SELECT id, request_code, customer_id, status FROM purchase_requests WHERE id = $1 FOR UPDATE`,
      [id]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = reqRes.rows[0];

    // Validate state transition (Pending -> Rejected)
    WorkflowEngine.validateTransition(request.status, WORKFLOW_STATES.REJECTED);

    // Record rejection
    await client.query(
      `INSERT INTO request_approvals (request_id, shopkeeper_id, decision, reason)
       VALUES ($1, $2, 'Rejected', $3)`,
      [id, shopkeeperId, reason]
    );

    // Update request status
    await client.query(
      `UPDATE purchase_requests SET status = 'Rejected', rejection_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [reason, id]
    );

    // Notify customer
    await WorkflowEngine.sendNotification({
      recipientId: request.customer_id,
      eventType: 'REQUEST_REJECTED',
      title: 'Purchase Request Rejected',
      message: `Your purchase request ${request.request_code} was declined. Reason: ${reason}`,
      relatedEntityType: 'purchase_requests',
      relatedEntityId: id,
      client
    });

    await WorkflowEngine.logAudit({
      actorId: shopkeeperId,
      actorRole: 'Shopkeeper',
      action: 'REJECT_REQUEST',
      entityType: 'purchase_requests',
      entityId: id,
      details: { requestCode: request.request_code, reason },
      client
    });

    await client.query('COMMIT');

    res.json({ success: true, message: `Request ${request.request_code} was rejected.` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const searchVendors = async (req, res, next) => {
  try {
    const { productId, quantity } = req.query;

    if (!productId || !quantity || Number(quantity) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid productId and positive quantity are required.' });
    }

    const evaluation = await VendorDecisionEngine.evaluateVendors(Number(productId), Number(quantity));
    res.json({ success: true, ...evaluation });
  } catch (err) {
    next(err);
  }
};

export const searchVendorBasket = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ success: false, message: 'Add between 1 and 50 products to compare vendors.' });
    }

    const normalizedItems = [];
    const seenProductIds = new Set();
    for (const item of items) {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity);
      if (!Number.isSafeInteger(productId) || productId <= 0
        || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100000) {
        return res.status(400).json({ success: false, message: 'Each product needs a valid product and quantity.' });
      }
      if (seenProductIds.has(productId)) {
        return res.status(400).json({ success: false, message: 'Add each product only once; update its quantity in the product list.' });
      }
      seenProductIds.add(productId);
      normalizedItems.push({ productId, quantity });
    }

    const evaluation = await VendorDecisionEngine.evaluateVendorBasket(normalizedItems);
    res.json({ success: true, ...evaluation });
  } catch (err) {
    next(err);
  }
};

export const createVendorBasketEnquiry = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const shopkeeperId = req.user.id;
    const vendorId = Number(req.body.vendorId);
    const items = req.body.items;
    if (!Number.isSafeInteger(vendorId) || vendorId <= 0
      || !Array.isArray(items) || items.length === 0 || items.length > 50) {
      return res.status(400).json({ success: false, message: 'Choose a vendor and add between 1 and 50 products.' });
    }

    const normalizedItems = [];
    const productIds = new Set();
    const requestIds = new Set();
    for (const item of items) {
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity);
      const requestId = item?.requestId ? Number(item.requestId) : null;
      if (!Number.isSafeInteger(productId) || productId <= 0
        || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100000
        || (requestId !== null && (!Number.isSafeInteger(requestId) || requestId <= 0))) {
        return res.status(400).json({ success: false, message: 'Each line needs a valid product and positive whole-number quantity.' });
      }
      if (productIds.has(productId) || (requestId && requestIds.has(requestId))) {
        return res.status(400).json({ success: false, message: 'Products and linked requests must be unique in a vendor request.' });
      }
      productIds.add(productId);
      if (requestId) requestIds.add(requestId);
      normalizedItems.push({ productId, quantity, requestId });
    }

    await client.query('BEGIN');
    const vendorResult = await client.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'Vendor' AND is_active = TRUE FOR SHARE`,
      [vendorId]
    );
    if (vendorResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Selected vendor is not active.' });
    }

    const productsResult = await client.query(
      `SELECT id, name, unit FROM products WHERE is_active = TRUE AND id = ANY($1::bigint[])`,
      [Array.from(productIds)]
    );
    if (productsResult.rows.length !== normalizedItems.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'One or more selected products are unavailable.' });
    }
    const products = new Map(productsResult.rows.map((product) => [String(product.id), product]));

    const linkedItems = normalizedItems.filter((item) => item.requestId);
    let approvedRequests = [];
    if (linkedItems.length) {
      const requestResult = await client.query(
        `SELECT pr.id, pr.request_code, pr.product_id, pr.quantity, pr.status
         FROM purchase_requests pr
         WHERE pr.id = ANY($1::bigint[])
           AND EXISTS (
             SELECT 1 FROM request_approvals approval
             WHERE approval.request_id = pr.id
               AND approval.shopkeeper_id = $2
               AND approval.decision = 'Approved'
           )
         ORDER BY pr.id
         FOR UPDATE OF pr`,
        [linkedItems.map((item) => item.requestId), shopkeeperId]
      );
      approvedRequests = requestResult.rows;
      if (approvedRequests.length !== linkedItems.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Every linked request must be approved by your shop.' });
      }
    }
    const requestsById = new Map(approvedRequests.map((request) => [String(request.id), request]));

    for (const item of normalizedItems) {
      if (!item.requestId) continue;
      const request = requestsById.get(String(item.requestId));
      if (!request || !['Approved', 'Vendor Selected'].includes(request.status)
        || Number(request.product_id) !== item.productId || Number(request.quantity) !== item.quantity) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'A linked request is not open or its product/quantity does not match your basket.' });
      }
    }

    const stockResult = await client.query(
      `SELECT product_id, available_stock
       FROM vendor_stock
       WHERE vendor_id = $1 AND product_id = ANY($2::bigint[])`,
      [vendorId, Array.from(productIds)]
    );
    const stockByProduct = new Map(stockResult.rows.map((stock) => [String(stock.product_id), Number(stock.available_stock)]));
    const unavailable = normalizedItems.filter((item) => (stockByProduct.get(String(item.productId)) || 0) < item.quantity);
    if (unavailable.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'The selected vendor no longer has enough stock for every product. Re-evaluate the basket and choose an eligible vendor.'
      });
    }

    const code = `BASKET-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const basketResult = await client.query(
      `INSERT INTO vendor_basket_enquiries (enquiry_code, shopkeeper_id, vendor_id, status, notes)
       VALUES ($1, $2, $3, 'Sent', $4)
       RETURNING id, enquiry_code, status, created_at`,
      [code, shopkeeperId, vendorId, typeof req.body.notes === 'string' ? req.body.notes.trim().slice(0, 2000) : null]
    );
    const basket = basketResult.rows[0];
    for (const item of normalizedItems) {
      let requestId = item.requestId;
      if (!requestId) {
        const requestCode = `RESTOCK-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
        const requestResult = await client.query(
          `INSERT INTO purchase_requests
             (request_code, customer_id, product_id, quantity, unit, description, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'Approved')
           RETURNING id`,
          [
            requestCode,
            shopkeeperId,
            item.productId,
            item.quantity,
            products.get(String(item.productId)).unit,
            `Internal shop restock requested through vendor enquiry ${code}.`
          ]
        );
        requestId = requestResult.rows[0].id;
        await client.query(
          `INSERT INTO request_approvals (request_id, shopkeeper_id, decision, reason)
           VALUES ($1, $2, 'Approved', 'Shopkeeper-created internal restock request.')`,
          [requestId, shopkeeperId]
        );
      }
      await client.query(
        `INSERT INTO vendor_basket_enquiry_items
           (basket_enquiry_id, request_id, product_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [basket.id, requestId, item.productId, item.quantity]
      );
    }

    await WorkflowEngine.sendNotification({
      recipientId: vendorId,
      eventType: 'NEW_VENDOR_BASKET_ENQUIRY',
      title: 'New multi-product restock request',
      message: `Restock request ${basket.enquiry_code} includes ${normalizedItems.length} product line(s). Review stock and approve or decline the full request.`,
      relatedEntityType: 'vendor_basket_enquiries',
      relatedEntityId: basket.id,
      client
    });
    await WorkflowEngine.logAudit({
      actorId: shopkeeperId,
      actorRole: 'Shopkeeper',
      action: 'SEND_VENDOR_BASKET_ENQUIRY',
      entityType: 'vendor_basket_enquiries',
      entityId: basket.id,
      details: { enquiryCode: basket.enquiry_code, vendorId, items: normalizedItems },
      ip: req.ip,
      client
    });
    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Restock request ${basket.enquiry_code} sent to the selected vendor.`,
      enquiry: basket
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getShopkeeperBasketEnquiries = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT basket.id, basket.enquiry_code, basket.status, basket.vendor_decision,
              basket.notes, basket.vendor_comments, basket.created_at, basket.responded_at,
              basket.approved_at,
              vendor.full_name AS vendor_name, vendor.phone AS vendor_phone,
              vendorProfile.company_name AS vendor_company,
              vendorProfile.address AS vendor_address,
              shop.store_name AS shop_name, shop.branch AS shop_branch,
              shop.address AS shop_address, shopkeeper.full_name AS shopkeeper_name,
              COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'product_id', product.id,
                    'product_name', product.name,
                    'unit', product.unit,
                    'quantity', item.quantity,
                    'quoted_unit_price', item.quoted_unit_price,
                    'available_quantity', item.available_quantity,
                    'estimated_days', item.estimated_days,
                    'request_code', request.request_code,
                    'purchase_order_id', po.id,
                    'po_number', po.po_number,
                    'order_status', po.status,
                    'order_date', po.order_date,
                    'dispatched_at', po.dispatched_at,
                    'received_at', po.received_at,
                    'unit_price', po.unit_price,
                    'total_amount', po.total_amount,
                    'invoice_number', invoice.invoice_number,
                    'invoice_status', invoice.status,
                    'invoice_amount', invoice.total_amount,
                    'payment_number', payment.payment_number,
                    'payment_status', payment.status,
                    'payment_method', payment.payment_method,
                    'payment_reference', payment.reference_number,
                    'payment_amount', payment.amount,
                    'payment_date', payment.payment_date,
                    'grn_number', grn.grn_number,
                    'grn_status', grn.status
                  ) ORDER BY product.name
                ) FILTER (WHERE item.id IS NOT NULL),
                '[]'::jsonb
              ) AS items
       FROM vendor_basket_enquiries basket
       JOIN users vendor ON vendor.id = basket.vendor_id
       LEFT JOIN vendor_profiles vendorProfile ON vendorProfile.user_id = vendor.id
       JOIN users shopkeeper ON shopkeeper.id = basket.shopkeeper_id
       LEFT JOIN shopkeeper_profiles shop ON shop.user_id = basket.shopkeeper_id
       LEFT JOIN vendor_basket_enquiry_items item ON item.basket_enquiry_id = basket.id
       LEFT JOIN products product ON product.id = item.product_id
       LEFT JOIN purchase_requests request ON request.id = item.request_id
       LEFT JOIN purchase_orders po ON po.id = item.purchase_order_id
       LEFT JOIN invoices invoice ON invoice.po_id = po.id
       LEFT JOIN payments payment ON payment.po_id = po.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       WHERE basket.shopkeeper_id = $1
       GROUP BY basket.id, vendor.full_name, vendor.phone, vendorProfile.company_name,
                vendorProfile.address, shop.store_name, shop.branch, shop.address,
                shopkeeper.full_name
       ORDER BY basket.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, enquiries: result.rows });
  } catch (error) {
    next(error);
  }
};

export const sendEnquiry = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { requestId, vendorId, notes } = req.body;
    const shopkeeperId = req.user.id;

    if (!requestId || !vendorId) {
      return res.status(400).json({ success: false, message: 'requestId and vendorId are required.' });
    }

    await client.query('BEGIN');

    const reqRes = await client.query(
      `SELECT pr.*, p.name AS product_name FROM purchase_requests pr 
       JOIN products p ON pr.product_id = p.id WHERE pr.id = $1`,
      [requestId]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const request = reqRes.rows[0];
    const enquiryCode = `ENQ-${Date.now().toString().slice(-6)}`;

    const enqRes = await client.query(
      `INSERT INTO vendor_enquiries (enquiry_code, request_id, shopkeeper_id, vendor_id, product_id, quantity, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Sent')
       RETURNING *`,
      [enquiryCode, requestId, shopkeeperId, vendorId, request.product_id, request.quantity, notes || '']
    );

    // Notify vendor
    await WorkflowEngine.sendNotification({
      recipientId: vendorId,
      eventType: 'NEW_ENQUIRY',
      title: 'New Procurement Enquiry Received',
      message: `Enquiry ${enquiryCode} received from shopkeeper for ${request.quantity} units of ${request.product_name}.`,
      relatedEntityType: 'vendor_enquiries',
      relatedEntityId: enqRes.rows[0].id,
      client
    });

    await WorkflowEngine.logAudit({
      actorId: shopkeeperId,
      actorRole: 'Shopkeeper',
      action: 'SEND_VENDOR_ENQUIRY',
      entityType: 'vendor_enquiries',
      entityId: enqRes.rows[0].id,
      details: { enquiryCode, requestId, vendorId },
      client
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Enquiry ${enquiryCode} dispatched to vendor.`,
      enquiry: enqRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getEnquiries = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        ve.*,
        p.name AS product_name,
        v.full_name AS vendor_name,
        pr.request_code,
        ver.quoted_price,
        ver.available_quantity,
        ver.estimated_days,
        ver.comments,
        ver.status AS response_status,
        ver.responded_at
       FROM vendor_enquiries ve
       JOIN products p ON ve.product_id = p.id
       JOIN users v ON ve.vendor_id = v.id
       JOIN purchase_requests pr ON ve.request_id = pr.id
       LEFT JOIN vendor_enquiry_responses ver ON ver.enquiry_id = ve.id
       ORDER BY ve.created_at DESC`
    );

    res.json({ success: true, enquiries: result.rows });
  } catch (err) {
    next(err);
  }
};

export const confirmOrder = async (req, res, next) => {
  try {
    const { requestId, vendorId } = req.body;
    const shopkeeperId = req.user.id;

    if (!requestId || !vendorId) {
      return res.status(400).json({ success: false, message: 'requestId and vendorId are required.' });
    }

    // Fetch request details
    const reqRes = await pool.query(
      'SELECT product_id, quantity, status FROM purchase_requests WHERE id = $1',
      [requestId]
    );

    if (reqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase request not found.' });
    }

    const { product_id, quantity } = reqRes.rows[0];

    // Delegate to Engine 4 for Concurrently Safe Stock Reservation & PO Creation
    const result = await ConcurrentStockEngine.reserveStockAndCreatePO({
      requestId,
      shopkeeperId,
      vendorId,
      productId: product_id,
      quantity,
      ip: req.ip
    });

    res.status(201).json({
      success: true,
      message: `Purchase Order ${result.purchaseOrder.po_number} confirmed and stock locked successfully!`,
      order: result.purchaseOrder,
      remainingStock: result.remainingStock
    });
  } catch (err) {
    next(err);
  }
};

export const confirmBasketOrder = async (req, res, next) => {
  try {
    const vendorId = Number(req.body.vendorId);
    const items = req.body.items;
    if (!Number.isSafeInteger(vendorId) || vendorId <= 0
      || !Array.isArray(items) || items.length < 2 || items.length > 50) {
      return res.status(400).json({ success: false, message: 'Choose a vendor and add between 2 and 50 approved restock lines.' });
    }

    const normalizedItems = [];
    const requestIds = new Set();
    const productIds = new Set();
    for (const item of items) {
      const requestId = Number(item?.requestId);
      const productId = Number(item?.productId);
      const quantity = Number(item?.quantity);
      if (!Number.isSafeInteger(requestId) || requestId <= 0
        || !Number.isSafeInteger(productId) || productId <= 0
        || !Number.isSafeInteger(quantity) || quantity <= 0 || quantity > 100000) {
        return res.status(400).json({ success: false, message: 'Each basket line must match an approved request, product, and positive whole-number quantity.' });
      }
      if (requestIds.has(requestId) || productIds.has(productId)) {
        return res.status(400).json({ success: false, message: 'Each approved request and product can appear only once in the restock list.' });
      }
      requestIds.add(requestId);
      productIds.add(productId);
      normalizedItems.push({ requestId, productId, quantity });
    }

    const result = await ConcurrentStockEngine.reserveBasketAndCreatePOs({
      items: normalizedItems,
      shopkeeperId: req.user.id,
      vendorId,
      ip: req.ip
    });
    res.status(201).json({
      success: true,
      message: `All ${result.purchaseOrders.length} restock items were ordered from one vendor.`,
      purchaseOrders: result.purchaseOrders,
      remainingStocks: result.remainingStocks
    });
  } catch (error) {
    next(error);
  }
};

export const getAllOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT 
        po.*,
        p.name AS product_name,
        p.category AS product_category,
        v.full_name AS vendor_name,
        v.phone AS vendor_phone,
        vp.company_name AS vendor_company,
        vp.address AS vendor_address,
        pr.request_code,
        c.full_name AS customer_name,
        po.order_date,
        grn.id AS grn_id,
        grn.grn_number,
        grn.received_quantity AS grn_received_quantity,
        grn.status AS grn_status,
        grn.receipt_date AS grn_receipt_date,
        CASE WHEN grn.shopkeeper_id IS NOT NULL THEN 'Shopkeeper' WHEN grn.warehouse_id IS NOT NULL THEN 'Warehouse' END AS grn_received_by_role,
        inv.id AS invoice_id,
        inv.invoice_number,
        inv.status AS invoice_status,
        inv.invoice_date,
        inv.quantity AS invoice_quantity,
        inv.unit_price AS invoice_unit_price,
        inv.total_amount AS invoice_total,
        pay.id AS payment_id,
        pay.payment_number,
        pay.status AS payment_status,
        pay.payment_method,
        pay.reference_number,
        pay.amount AS payment_amount,
        pay.payment_date,
        reconciliation.status AS reconciliation_status,
        reconciliation.is_matched,
        reconciliation.discrepancy_details
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = v.id
       JOIN purchase_requests pr ON po.request_id = pr.id
       JOIN users c ON pr.customer_id = c.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       LEFT JOIN invoices inv ON inv.po_id = po.id
       LEFT JOIN payments pay ON pay.po_id = po.id
       LEFT JOIN LATERAL (
         SELECT rec.status, rec.is_matched, rec.discrepancy_details
         FROM reconciliations rec
         WHERE rec.po_id = po.id
         ORDER BY rec.reconciled_at DESC
         LIMIT 1
       ) reconciliation ON TRUE
       WHERE po.shopkeeper_id = $1
       ORDER BY po.order_date DESC, po.id DESC`,
      [req.user.id]
    );

    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        po.*,
        p.name AS product_name,
        p.unit AS product_unit,
        p.category AS product_category,
        v.full_name AS vendor_name,
        v.email AS vendor_email,
        v.phone AS vendor_phone,
        vp.company_name AS vendor_company,
        vp.address AS vendor_address,
        sk.full_name AS shopkeeper_name,
        sk.phone AS shopkeeper_phone,
        shop.store_name,
        shop.branch,
        shop.address AS shop_address,
        pr.request_code,
        pr.status AS request_status,
        c.full_name AS customer_name,
        c.email AS customer_email,
        grn.grn_number,
        grn.received_quantity,
        grn.damaged_quantity,
        grn.missing_quantity,
        grn.status AS grn_status,
        grn.remarks AS grn_remarks,
        grn.receipt_date,
        grn.received_quantity AS grn_received_quantity,
        grn.damaged_quantity AS grn_damaged_quantity,
        grn.missing_quantity AS grn_missing_quantity,
        grnReceiver.full_name AS grn_received_by_name,
        CASE WHEN grn.shopkeeper_id IS NOT NULL THEN 'Shopkeeper' WHEN grn.warehouse_id IS NOT NULL THEN 'Warehouse' END AS grn_received_by_role,
        inv.invoice_number,
        inv.status AS invoice_status,
        inv.total_amount AS invoice_amount,
        inv.quantity AS invoice_quantity,
        inv.unit_price AS invoice_unit_price,
        inv.invoice_date,
        inv.created_at AS invoice_created_at,
        reconciliation.status AS reconciliation_status,
        reconciliation.is_matched,
        reconciliation.discrepancy_details,
        pay.payment_number,
        pay.status AS payment_status,
        pay.payment_method,
        pay.reference_number,
        pay.amount AS payment_amount,
        pay.payment_date
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       LEFT JOIN vendor_profiles vp ON vp.user_id = v.id
       JOIN users sk ON sk.id = po.shopkeeper_id
       LEFT JOIN shopkeeper_profiles shop ON shop.user_id = sk.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       LEFT JOIN users grnReceiver ON grnReceiver.id = COALESCE(grn.warehouse_id, grn.shopkeeper_id)
       JOIN purchase_requests pr ON po.request_id = pr.id
       JOIN users c ON pr.customer_id = c.id
       LEFT JOIN invoices inv ON inv.po_id = po.id
       LEFT JOIN payments pay ON pay.po_id = po.id
       LEFT JOIN LATERAL (
         SELECT rec.status, rec.is_matched, rec.discrepancy_details
         FROM reconciliations rec
         WHERE rec.po_id = po.id
         ORDER BY rec.reconciled_at DESC
         LIMIT 1
       ) reconciliation ON TRUE
       WHERE po.id = $1 AND po.shopkeeper_id = $2`,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }

    res.json({ success: true, order: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const markShopkeeperOrderReceived = async (req, res, next) => {
  const orderId = Number(req.params.id);
  const receivedQuantity = Number(req.body.receivedQuantity);
  const damagedQuantity = req.body.damagedQuantity === undefined ? 0 : Number(req.body.damagedQuantity);
  const remarks = typeof req.body.remarks === 'string' ? req.body.remarks.trim().slice(0, 2000) : '';
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, message: 'A valid purchase order is required.' });
  }
  if (
    req.body.receivedQuantity === undefined ||
    !Number.isSafeInteger(receivedQuantity) ||
    receivedQuantity < 0 ||
    !Number.isSafeInteger(damagedQuantity) ||
    damagedQuantity < 0
  ) {
    return res.status(400).json({ success: false, message: 'Enter valid whole-number received and damaged quantities.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT po.id, po.po_number, po.vendor_id, po.status, po.quantity, po.product_id, po.request_id
       FROM purchase_orders po
       WHERE po.id = $1 AND po.shopkeeper_id = $2
       FOR UPDATE`,
      [orderId, req.user.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase order not found.' });
    }
    const order = result.rows[0];
    if (order.status !== 'Shipped') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'The vendor must dispatch this order before you can record its receipt.' });
    }
    if (receivedQuantity > Number(order.quantity) || damagedQuantity > receivedQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Received quantity cannot exceed the PO quantity, and damaged quantity cannot exceed the received quantity.' });
    }

    const invoiceResult = await client.query(
      `SELECT id FROM invoices WHERE po_id = $1 FOR SHARE`,
      [orderId]
    );
    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Wait for the vendor to submit the invoice after dispatch before recording receipt.' });
    }

    const existingReceipt = await client.query(
      `SELECT id FROM goods_receipts WHERE po_id = $1`,
      [orderId]
    );
    if (existingReceipt.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'A goods receipt has already been recorded for this purchase order.' });
    }

    const missingQuantity = Number(order.quantity) - receivedQuantity;
    const receiptStatus = receivedQuantity === Number(order.quantity) && damagedQuantity === 0
      ? 'Full'
      : receivedQuantity < Number(order.quantity) && damagedQuantity === 0
        ? 'Partial'
        : 'Discrepancy';
    const grnNumber = `GRN-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
    const receiptResult = await client.query(
      `INSERT INTO goods_receipts
         (grn_number, po_id, warehouse_id, shopkeeper_id, ordered_quantity,
          received_quantity, damaged_quantity, missing_quantity, status, remarks, receipt_date)
       VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        grnNumber,
        orderId,
        req.user.id,
        order.quantity,
        receivedQuantity,
        damagedQuantity,
        missingQuantity,
        receiptStatus,
        remarks || 'Physical quantity confirmed by shopkeeper.'
      ]
    );

    await client.query(
      `UPDATE purchase_orders
       SET status = 'Received', received_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [orderId]
    );
    const sellableQuantity = Math.max(receivedQuantity - damagedQuantity, 0);
    const stockResult = await client.query(
      `UPDATE shop_stock
       SET available_stock = available_stock + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE shopkeeper_id = $2 AND product_id = $3
       RETURNING available_stock`,
      [sellableQuantity, req.user.id, order.product_id]
    );
    if (stockResult.rows.length > 0) {
      await client.query(
        `UPDATE goods_receipts
         SET shop_stock_applied_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [receiptResult.rows[0].id]
      );
    }
    await client.query(
      `UPDATE purchase_requests SET status = 'Received', updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [order.request_id]
    );
    await WorkflowEngine.sendNotification({
      recipientId: order.vendor_id,
      eventType: 'SHOPKEEPER_RECORDED_GOODS_RECEIPT',
      title: 'Shopkeeper recorded goods receipt',
      message: `Shopkeeper recorded GRN ${grnNumber} for ${order.po_number}: ${receivedQuantity} received, ${damagedQuantity} damaged, ${missingQuantity} missing. Finance will review the three-way match.`,
      relatedEntityType: 'purchase_orders',
      relatedEntityId: orderId,
      client
    });
    const financeUsers = await client.query(
      `SELECT id FROM users WHERE role = 'Finance' AND is_active = TRUE`
    );
    for (const financeUser of financeUsers.rows) {
      await WorkflowEngine.sendNotification({
        recipientId: financeUser.id,
        eventType: 'SHOPKEEPER_GRN_AVAILABLE',
        title: 'Shopkeeper GRN ready for three-way match',
        message: `GRN ${grnNumber} for PO ${order.po_number} is ready to compare with the purchase order and vendor invoice.`,
        relatedEntityType: 'goods_receipts',
        relatedEntityId: receiptResult.rows[0].id,
        client
      });
    }
    await WorkflowEngine.logAudit({
      actorId: req.user.id,
      actorRole: 'Shopkeeper',
      action: 'RECORD_SHOPKEEPER_GOODS_RECEIPT',
      entityType: 'goods_receipts',
      entityId: receiptResult.rows[0].id,
      details: {
        grnNumber,
        poNumber: order.po_number,
        orderedQuantity: Number(order.quantity),
        receivedQuantity,
        damagedQuantity,
        missingQuantity,
        status: receiptStatus
      },
      ip: req.ip,
      client
    });
    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: stockResult.rows.length > 0
        ? `GRN ${grnNumber} recorded and ${sellableQuantity} sellable units added to shop stock. Finance has been notified to compare the PO, GRN, and vendor invoice.`
        : `GRN ${grnNumber} recorded, but no shop listing exists for this product. Add the product to your inventory and set its retail price and expiry date. Finance has been notified to compare the PO, GRN, and vendor invoice.`,
      goodsReceipt: receiptResult.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const getRetailInventory = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.unit,
        p.description,
        ss.available_stock,
        ss.unit_price,
        TO_CHAR(ss.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ss.updated_at
       FROM products p
       LEFT JOIN shop_stock ss
         ON ss.product_id = p.id AND ss.shopkeeper_id = $1
       WHERE p.is_active = TRUE
       ORDER BY p.category, p.name`,
      [req.user.id]
    );

    res.json({ success: true, products: result.rows });
  } catch (err) {
    next(err);
  }
};

export const createRetailProduct = async (req, res, next) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
  const unit = typeof req.body.unit === 'string' ? req.body.unit.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const availableStock = Number(req.body.availableStock);
  const unitPrice = Number(req.body.unitPrice);
  const expiryDate = req.body.expiryDate;
  const parsedExpiry = new Date(`${expiryDate}T00:00:00Z`);

  if (!name || !category || !unit || name.length > 255 || category.length > 100 || unit.length > 50) {
    return res.status(400).json({ success: false, message: 'Enter a product name, category, and unit within the allowed lengths.' });
  }
  if (
    req.body.availableStock === undefined ||
    req.body.availableStock === null ||
    String(req.body.availableStock).trim() === '' ||
    !Number.isSafeInteger(availableStock) ||
    availableStock < 0
  ) {
    return res.status(400).json({ success: false, message: 'Stock must be a non-negative whole number.' });
  }
  if (
    req.body.unitPrice === undefined ||
    req.body.unitPrice === null ||
    String(req.body.unitPrice).trim() === '' ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    return res.status(400).json({ success: false, message: 'Price must be greater than zero.' });
  }
  if (
    typeof expiryDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ||
    Number.isNaN(parsedExpiry.getTime()) ||
    parsedExpiry.toISOString().slice(0, 10) !== expiryDate
  ) {
    return res.status(400).json({ success: false, message: 'Enter a valid expiry date.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext(LOWER($1)))', [name]);
    const existing = await client.query(
      'SELECT id, is_active FROM products WHERE LOWER(name) = LOWER($1)',
      [name]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      const message = existing.rows[0].is_active
        ? 'A product with this name already exists in the catalog. Add it from the catalog instead.'
        : 'An inactive product with this name exists. Ask an Admin to restore it.';
      return res.status(409).json({ success: false, message });
    }

    const productResult = await client.query(
      `INSERT INTO products (name, category, unit, description, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, name, category, unit, description`,
      [name, category, unit, description]
    );
    const product = productResult.rows[0];
    const listingResult = await client.query(
      `INSERT INTO shop_stock (shopkeeper_id, product_id, available_stock, unit_price, expiry_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       RETURNING id, product_id, available_stock, unit_price, TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date`,
      [req.user.id, product.id, availableStock, unitPrice, expiryDate]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, product, listing: listingResult.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A product with this name already exists in the catalog.' });
    }
    next(err);
  } finally {
    client.release();
  }
};

export const upsertRetailListing = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    const availableStock = Number(req.body.availableStock);
    const unitPrice = Number(req.body.unitPrice);
    const expiryDate = req.body.expiryDate;

    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid product is required.' });
    }

    if (
      req.body.availableStock === undefined ||
      req.body.availableStock === null ||
      String(req.body.availableStock).trim() === '' ||
      !Number.isSafeInteger(availableStock) ||
      availableStock < 0
    ) {
      return res.status(400).json({ success: false, message: 'Stock must be a non-negative whole number.' });
    }

    if (
      req.body.unitPrice === undefined ||
      req.body.unitPrice === null ||
      String(req.body.unitPrice).trim() === '' ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return res.status(400).json({ success: false, message: 'Price must be greater than zero.' });
    }

    const parsedExpiry = new Date(`${expiryDate}T00:00:00Z`);
    if (
      typeof expiryDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ||
      Number.isNaN(parsedExpiry.getTime()) ||
      parsedExpiry.toISOString().slice(0, 10) !== expiryDate
    ) {
      return res.status(400).json({ success: false, message: 'Enter a valid expiry date.' });
    }

    const result = await pool.query(
      `INSERT INTO shop_stock (shopkeeper_id, product_id, available_stock, unit_price, expiry_date, updated_at)
       SELECT $1, p.id, $3, $4, $5, CURRENT_TIMESTAMP
       FROM products p
       WHERE p.id = $2 AND p.is_active = TRUE
       ON CONFLICT (shopkeeper_id, product_id)
       DO UPDATE SET
         available_stock = EXCLUDED.available_stock,
         unit_price = EXCLUDED.unit_price,
         expiry_date = EXCLUDED.expiry_date,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, productId, availableStock, unitPrice, expiryDate]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteRetailListing = async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isSafeInteger(productId) || productId <= 0) {
      return res.status(400).json({ success: false, message: 'A valid product is required.' });
    }

    const result = await pool.query(
      `DELETE FROM shop_stock
       WHERE shopkeeper_id = $1 AND product_id = $2
       RETURNING id`,
      [req.user.id, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Your shop does not have a listing for this product.' });
    }

    res.json({ success: true, message: 'Your shop listing was removed.' });
  } catch (err) {
    next(err);
  }
};

export const updateStoreLocation = async (req, res, next) => {
  try {
    const latitude = Number(req.body.latitude);
    const longitude = Number(req.body.longitude);

    if (
      req.body.latitude === undefined ||
      req.body.latitude === null ||
      req.body.latitude === '' ||
      req.body.longitude === undefined ||
      req.body.longitude === null ||
      req.body.longitude === '' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({ success: false, message: 'Enter valid latitude and longitude coordinates.' });
    }

    const result = await pool.query(
      `UPDATE shopkeeper_profiles
       SET latitude = $1, longitude = $2
       WHERE user_id = $3
       RETURNING user_id, store_name, branch, address, latitude, longitude`,
      [latitude, longitude, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shop profile not found.' });
    }

    res.json({ success: true, profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
