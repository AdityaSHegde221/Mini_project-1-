import pool from '../config/db.js';
import WorkflowEngine from '../modules/E1-Workflow/workflowEngine.js';
import ConcurrentStockEngine from '../modules/E4-Concurrent-Stock/stockEngine.js';

export const getProfile = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const resProfile = await pool.query(
      `SELECT u.id, u.email, u.full_name, u.phone, vp.* 
       FROM users u
       LEFT JOIN vendor_profiles vp ON u.id = vp.user_id
       WHERE u.id = $1`,
      [vendorId]
    );

    res.json({ success: true, profile: resProfile.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { companyName, address, contactPerson, taxId, phone } = req.body;

    if (phone) {
      await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, vendorId]);
    }

    const upRes = await pool.query(
      `UPDATE vendor_profiles 
       SET company_name = COALESCE($1, company_name),
           address = COALESCE($2, address),
           contact_person = COALESCE($3, contact_person),
           tax_id = COALESCE($4, tax_id)
       WHERE user_id = $5 RETURNING *`,
      [companyName, address, contactPerson, taxId, vendorId]
    );

    res.json({ success: true, message: 'Profile updated successfully.', profile: upRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getProductsAndStock = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const result = await pool.query(
      `SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.unit,
        p.description,
        vs.id AS stock_id,
        COALESCE(vs.available_stock, 0) AS available_stock,
        COALESCE(vs.unit_price, 0.00) AS unit_price,
        COALESCE(vs.lead_time_days, 2) AS lead_time_days,
        vs.updated_at AS stock_updated_at
       FROM products p
       LEFT JOIN vendor_stock vs ON vs.product_id = p.id AND vs.vendor_id = $1
        WHERE p.is_active = TRUE
       ORDER BY p.name ASC`,
      [vendorId]
    );

    res.json({ success: true, products: result.rows });
  } catch (err) {
    next(err);
  }
};

export const updateStock = async (req, res, next) => {
  try {
    const vendorId = req.user.id;
    const { productId, availableStock, unitPrice, leadTimeDays } = req.body;

    if (!productId || availableStock === undefined || unitPrice === undefined) {
      return res.status(400).json({ success: false, message: 'productId, availableStock, and unitPrice are required.' });
    }

    if (Number(availableStock) < 0 || Number(unitPrice) <= 0) {
      return res.status(400).json({ success: false, message: 'Stock cannot be negative and price must be greater than zero.' });
    }

    const productResult = await pool.query(
      'SELECT id FROM products WHERE id = $1 AND is_active = TRUE',
      [productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Active product not found.' });
    }

    const upsertRes = await pool.query(
      `INSERT INTO vendor_stock (vendor_id, product_id, available_stock, unit_price, lead_time_days, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (vendor_id, product_id)
       DO UPDATE SET 
         available_stock = EXCLUDED.available_stock,
         unit_price = EXCLUDED.unit_price,
         lead_time_days = EXCLUDED.lead_time_days,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [vendorId, productId, availableStock, unitPrice, leadTimeDays || 2]
    );

    await WorkflowEngine.logAudit({
      actorId: vendorId,
      actorRole: 'Vendor',
      action: 'UPDATE_STOCK',
      entityType: 'vendor_stock',
      entityId: upsertRes.rows[0].id,
      details: { productId, availableStock, unitPrice }
    });

    res.json({ success: true, message: 'Stock inventory updated successfully.', stock: upsertRes.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getIncomingEnquiries = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const result = await pool.query(
      `SELECT 
        ve.*,
        p.name AS product_name,
        p.category AS product_category,
        p.unit AS product_unit,
        sk.full_name AS shopkeeper_name,
        sk.email AS shopkeeper_email,
        ver.quoted_price,
        ver.available_quantity,
        ver.estimated_days,
        ver.comments,
        ver.status AS response_status,
        ver.responded_at
       FROM vendor_enquiries ve
       JOIN products p ON ve.product_id = p.id
       JOIN users sk ON ve.shopkeeper_id = sk.id
       LEFT JOIN vendor_enquiry_responses ver ON ver.enquiry_id = ve.id
       WHERE ve.vendor_id = $1
       ORDER BY ve.created_at DESC`,
      [vendorId]
    );

    res.json({ success: true, enquiries: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getIncomingBasketEnquiries = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT basket.id, basket.enquiry_code, basket.status, basket.vendor_decision,
              basket.notes, basket.vendor_comments, basket.created_at, basket.responded_at,
              shopkeeper.full_name AS shopkeeper_name, shopkeeper.phone AS shopkeeper_phone,
              shop.store_name AS shop_name, shop.branch AS shop_branch,
              shop.address AS shop_address,
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
                    'po_number', po.po_number,
                    'order_status', po.status
                  ) ORDER BY product.name
                ) FILTER (WHERE item.id IS NOT NULL),
                '[]'::jsonb
              ) AS items
       FROM vendor_basket_enquiries basket
       JOIN users shopkeeper ON shopkeeper.id = basket.shopkeeper_id
       LEFT JOIN shopkeeper_profiles shop ON shop.user_id = basket.shopkeeper_id
       LEFT JOIN vendor_basket_enquiry_items item ON item.basket_enquiry_id = basket.id
       LEFT JOIN products product ON product.id = item.product_id
       LEFT JOIN purchase_orders po ON po.id = item.purchase_order_id
       WHERE basket.vendor_id = $1
       GROUP BY basket.id, shopkeeper.full_name, shopkeeper.phone,
                shop.store_name, shop.branch, shop.address
       ORDER BY basket.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, enquiries: result.rows });
  } catch (error) {
    next(error);
  }
};

export const respondToBasketEnquiry = async (req, res, next) => {
  const enquiryId = Number(req.params.id);
  const status = req.body.status;
  const comments = typeof req.body.comments === 'string' ? req.body.comments.trim().slice(0, 2000) : '';
  if (!Number.isSafeInteger(enquiryId) || enquiryId <= 0 || !['Approved', 'Declined'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid enquiry and approve or decline it.' });
  }

  try {
    const result = await ConcurrentStockEngine.respondToBasketEnquiry({
      enquiryId,
      vendorId: req.user.id,
      status,
      comments,
      ip: req.ip
    });
    res.json({
      success: true,
      message: status === 'Approved'
        ? `Restock request approved. ${result.purchaseOrders.length} purchase order(s) created and vendor stock reserved.`
        : 'Restock request declined and shopkeeper notified.',
      status: result.status,
      purchaseOrders: result.purchaseOrders
    });
  } catch (error) {
    next(error);
  }
};

export const respondToEnquiry = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const vendorId = req.user.id;
    const { id } = req.params; // enquiryId
    const { availableQuantity, quotedPrice, estimatedDays, comments, status } = req.body;

    if (availableQuantity === undefined || quotedPrice === undefined) {
      return res.status(400).json({ success: false, message: 'availableQuantity and quotedPrice are required.' });
    }

    await client.query('BEGIN');

    // Verify enquiry belongs to this vendor
    const enqRes = await client.query(
      `SELECT ve.*, p.name AS product_name FROM vendor_enquiries ve 
       JOIN products p ON ve.product_id = p.id
       WHERE ve.id = $1 AND ve.vendor_id = $2`,
      [id, vendorId]
    );

    if (enqRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Enquiry not found or access denied.' });
    }

    const enquiry = enqRes.rows[0];

    // Upsert enquiry response
    const respRes = await client.query(
      `INSERT INTO vendor_enquiry_responses (
        enquiry_id, vendor_id, available_quantity, quoted_price, estimated_days, comments, status, responded_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [id, vendorId, availableQuantity, quotedPrice, estimatedDays || 2, comments || '', status || 'Accepted']
    );

    // Update enquiry status to Quoted or Declined
    const enquiryStatus = status === 'Declined' ? 'Declined' : 'Quoted';
    await client.query(
      `UPDATE vendor_enquiries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [enquiryStatus, id]
    );

    // Notify shopkeeper
    await WorkflowEngine.sendNotification({
      recipientId: enquiry.shopkeeper_id,
      eventType: 'ENQUIRY_RESPONDED',
      title: 'Vendor Responded to Enquiry',
      message: `Vendor ${req.user.full_name} submitted quotation for enquiry ${enquiry.enquiry_code} (Quoted: ₹${Number(quotedPrice).toFixed(2)}, Available: ${availableQuantity}).`,
      relatedEntityType: 'vendor_enquiries',
      relatedEntityId: id,
      client
    });

    await WorkflowEngine.logAudit({
      actorId: vendorId,
      actorRole: 'Vendor',
      action: 'RESPOND_ENQUIRY',
      entityType: 'vendor_enquiries',
      entityId: id,
      details: { quotedPrice, availableQuantity, status: enquiryStatus },
      client
    });

    await client.query('COMMIT');

    res.json({ success: true, message: 'Enquiry quotation submitted to shopkeeper.', response: respRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getVendorOrders = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const result = await pool.query(
      `SELECT 
        po.*,
        p.name AS product_name,
        p.category AS product_category,
        p.unit AS product_unit,
        pr.request_code,
        sk.full_name AS shopkeeper_name,
        inv.id AS invoice_id,
        inv.invoice_number,
        inv.status AS invoice_status,
        inv.total_amount AS invoice_amount,
        inv.invoice_date,
        grn.id AS grn_id,
        grn.grn_number,
        grn.received_quantity,
        grn.damaged_quantity,
        grn.missing_quantity,
        grn.status AS grn_status,
        grn.receipt_date,
        rec.status AS reconciliation_status,
        rec.is_matched,
        pay.payment_number,
        pay.status AS payment_status,
        pay.payment_method,
        pay.reference_number,
        pay.amount AS payment_amount,
        pay.payment_date
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN purchase_requests pr ON po.request_id = pr.id
       JOIN users sk ON po.shopkeeper_id = sk.id
       LEFT JOIN invoices inv ON inv.po_id = po.id
       LEFT JOIN goods_receipts grn ON grn.po_id = po.id
       LEFT JOIN LATERAL (
         SELECT rec.status, rec.is_matched
         FROM reconciliations rec
         WHERE rec.po_id = po.id
         ORDER BY rec.reconciled_at DESC
         LIMIT 1
       ) rec ON TRUE
       LEFT JOIN payments pay ON pay.po_id = po.id
       WHERE po.vendor_id = $1
       ORDER BY po.created_at DESC`,
      [vendorId]
    );

    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};

export const dispatchVendorOrder = async (req, res, next) => {
  const orderId = Number(req.params.id);
  if (!Number.isSafeInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ success: false, message: 'A valid purchase order is required.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT po.id, po.po_number, po.shopkeeper_id, po.status
       FROM purchase_orders po
       WHERE po.id = $1 AND po.vendor_id = $2
       FOR UPDATE`,
      [orderId, req.user.id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase order not found for this vendor.' });
    }
    const order = result.rows[0];
    if (order.status !== 'Confirmed') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Only confirmed purchase orders can be marked as dispatched.' });
    }
    await client.query(
      `UPDATE purchase_orders
       SET status = 'Shipped', dispatched_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [orderId]
    );
    await WorkflowEngine.sendNotification({
      recipientId: order.shopkeeper_id,
      eventType: 'VENDOR_ORDER_DISPATCHED',
      title: 'Vendor dispatched your restock order',
      message: `Vendor dispatched purchase order ${order.po_number}. Track it in your Purchase Orders page.`,
      relatedEntityType: 'purchase_orders',
      relatedEntityId: orderId,
      client
    });
    await WorkflowEngine.logAudit({
      actorId: req.user.id,
      actorRole: 'Vendor',
      action: 'DISPATCH_VENDOR_ORDER',
      entityType: 'purchase_orders',
      entityId: orderId,
      details: { poNumber: order.po_number },
      ip: req.ip,
      client
    });
    await client.query('COMMIT');
    res.json({ success: true, message: `Purchase order ${order.po_number} marked as dispatched.` });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

export const createInvoice = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const vendorId = req.user.id;
    const poId = Number(req.body.poId);
    const quantity = Number(req.body.quantity);
    const unitPrice = Number(req.body.unitPrice);
    const invoiceNumberInput = typeof req.body.invoiceNumber === 'string' ? req.body.invoiceNumber.trim() : '';
    const invoiceDate = req.body.invoiceDate || new Date().toISOString().slice(0, 10);
    if (
      !Number.isSafeInteger(poId) || poId <= 0 ||
      !Number.isSafeInteger(quantity) || quantity <= 0 ||
      !Number.isFinite(unitPrice) || unitPrice <= 0 ||
      invoiceNumberInput.length > 50 ||
      typeof invoiceDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) ||
      Number.isNaN(new Date(`${invoiceDate}T00:00:00Z`).getTime()) ||
      new Date(`${invoiceDate}T00:00:00Z`).toISOString().slice(0, 10) !== invoiceDate
    ) {
      return res.status(400).json({ success: false, message: 'Enter a valid purchase order, invoice date, positive whole-number quantity, and positive unit price.' });
    }

    await client.query('BEGIN');

    // Verify PO belongs to this vendor
    const poRes = await client.query(
      `SELECT po.*, p.name AS product_name FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       WHERE po.id = $1 AND po.vendor_id = $2
       FOR UPDATE OF po`,
      [poId, vendorId]
    );

    if (poRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase order not found or does not belong to your vendor account.' });
    }

    const po = poRes.rows[0];
    if (!['Shipped', 'Received'].includes(po.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Dispatch the purchase order before submitting its invoice.' });
    }

    // Check if invoice already submitted for this PO
    const existing = await client.query('SELECT id FROM invoices WHERE po_id = $1', [poId]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'An invoice has already been generated for this purchase order.' });
    }

    const finalInvoiceNumber = invoiceNumberInput || `INV-${Date.now().toString().slice(-6)}`;
    const calculatedTotal = Number((quantity * unitPrice).toFixed(2));

    const invRes = await client.query(
      `INSERT INTO invoices (invoice_number, po_id, vendor_id, quantity, unit_price, total_amount, invoice_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Submitted')
       RETURNING *`,
      [finalInvoiceNumber, poId, vendorId, quantity, unitPrice, calculatedTotal, invoiceDate]
    );

    const newInvoice = invRes.rows[0];

    // Notify Finance officers of new submitted invoice
    const finRes = await client.query(`SELECT id FROM users WHERE role = 'Finance' AND is_active = TRUE`);
    for (const f of finRes.rows) {
      await WorkflowEngine.sendNotification({
        recipientId: f.id,
        eventType: 'NEW_INVOICE_SUBMITTED',
        title: 'New Vendor Invoice Submitted',
        message: `Vendor ${req.user.full_name} submitted Invoice ${finalInvoiceNumber} for ${po.po_number} (₹${calculatedTotal.toFixed(2)}). Ready for 3-way reconciliation.`,
        relatedEntityType: 'invoices',
        relatedEntityId: newInvoice.id,
        client
      });
    }
    await WorkflowEngine.sendNotification({
      recipientId: po.shopkeeper_id,
      eventType: 'VENDOR_INVOICE_SUBMITTED',
      title: 'Vendor submitted the purchase invoice',
      message: `Invoice ${finalInvoiceNumber} for PO ${po.po_number} was submitted. Record the actual received quantity to complete the PO/GRN/invoice handoff to Finance.`,
      relatedEntityType: 'invoices',
      relatedEntityId: newInvoice.id,
      client
    });

    await WorkflowEngine.logAudit({
      actorId: vendorId,
      actorRole: 'Vendor',
      action: 'SUBMIT_INVOICE',
      entityType: 'invoices',
      entityId: newInvoice.id,
      details: { invoiceNumber: finalInvoiceNumber, poNumber: po.po_number, totalAmount: calculatedTotal },
      client
    });

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Invoice ${finalInvoiceNumber} submitted successfully.`,
      invoice: newInvoice
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getInvoices = async (req, res, next) => {
  try {
    const vendorId = req.user.id;

    const result = await pool.query(
      `SELECT 
        inv.*,
        po.po_number,
        p.name AS product_name,
        pay.payment_number,
        pay.status AS payment_status,
        pay.payment_date
       FROM invoices inv
       JOIN purchase_orders po ON inv.po_id = po.id
       JOIN products p ON po.product_id = p.id
       LEFT JOIN payments pay ON pay.invoice_id = inv.id
       WHERE inv.vendor_id = $1
       ORDER BY inv.created_at DESC`,
      [vendorId]
    );

    res.json({ success: true, invoices: result.rows });
  } catch (err) {
    next(err);
  }
};
