import { randomUUID } from 'node:crypto';
import pool from '../config/db.js';
import { compareRetailOrder } from '../modules/E3-Data-Transaction/retailOrderMatching.js';

const isPositiveId = (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const makeCode = (prefix) => `${prefix}-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
const supportedPaymentMethods = new Set(['Cash', 'UPI', 'Card', 'Bank transfer', 'Other']);

const orderSelect = `
  SELECT
    ro.*,
    p.name AS product_name,
    p.category AS product_category,
    sp.store_name,
    sp.branch,
    customer.full_name AS customer_name,
    customer.email AS customer_email,
    invoice.id AS invoice_id,
    invoice.invoice_number,
    invoice.version AS invoice_version,
    invoice.quantity AS invoice_quantity,
    invoice.unit_price AS invoice_unit_price,
    invoice.total_amount AS invoice_total,
    invoice.issued_at AS invoice_issued_at,
    receipt.id AS receipt_id,
    receipt.received_quantity,
    receipt.is_matched AS receipt_matched,
    receipt.mismatch_details,
    receipt.confirmed_at AS receipt_confirmed_at,
    payment.id AS payment_id,
    payment.payment_number,
    payment.amount AS payment_amount,
    payment.payment_method,
    payment.reference_number,
    payment.payment_date
  FROM retail_orders ro
  JOIN products p ON p.id = ro.product_id
  JOIN users customer ON customer.id = ro.customer_id
  JOIN shopkeeper_profiles sp ON sp.user_id = ro.shopkeeper_id
  LEFT JOIN LATERAL (
    SELECT ri.*
    FROM retail_invoices ri
    WHERE ri.retail_order_id = ro.id
    ORDER BY ri.version DESC
    LIMIT 1
  ) invoice ON TRUE
  LEFT JOIN LATERAL (
    SELECT rr.*
    FROM retail_order_receipts rr
    WHERE rr.retail_order_id = ro.id
    ORDER BY rr.id DESC
    LIMIT 1
  ) receipt ON TRUE
  LEFT JOIN retail_payments payment ON payment.retail_order_id = ro.id
`;

const appendAudit = async (client, { user, action, orderId, details, ip }) => {
  await client.query(
    `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details, ip_address)
     VALUES ($1, $2, $3, 'retail_orders', $4, $5, $6)`,
    [user.id, user.role, action, orderId, JSON.stringify(details), ip || '127.0.0.1']
  );
};

const sendNotification = async (client, { recipientId, eventType, title, message, orderId }) => {
  await client.query(
    `INSERT INTO notifications (recipient_id, event_type, title, message, related_entity_type, related_entity_id)
     VALUES ($1, $2, $3, $4, 'retail_orders', $5)`,
    [recipientId, eventType, title, message, orderId]
  );
};

const getLatestInvoice = async (client, orderId) => {
  const result = await client.query(
    `SELECT * FROM retail_invoices
     WHERE retail_order_id = $1
     ORDER BY version DESC
     LIMIT 1`,
    [orderId]
  );
  return result.rows[0] || null;
};

const getLatestReceipt = async (client, orderId) => {
  const result = await client.query(
    `SELECT * FROM retail_order_receipts
     WHERE retail_order_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [orderId]
  );
  return result.rows[0] || null;
};

export const createRetailInterest = async (req, res, next) => {
  const productId = Number(req.body.productId);
  const shopkeeperId = Number(req.body.shopkeeperId);
  const quantity = Number(req.body.quantity);

  if (!isPositiveId(productId) || !isPositiveId(shopkeeperId) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 500) {
    return res.status(400).json({ success: false, message: 'Choose a valid shop and product, and enter a quantity from 1 to 500.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const offerResult = await client.query(
      `SELECT p.id, p.name, p.unit, ss.available_stock, ss.unit_price, ss.expiry_date
       FROM products p
       JOIN shop_stock ss ON ss.product_id = p.id
       JOIN users shop ON shop.id = ss.shopkeeper_id AND shop.role = 'Shopkeeper' AND shop.is_active = TRUE
       WHERE p.id = $1 AND ss.shopkeeper_id = $2 AND p.is_active = TRUE
       FOR UPDATE OF ss`,
      [productId, shopkeeperId]
    );
    if (offerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'This shop offer is no longer available.' });
    }

    const offer = offerResult.rows[0];
    if (offer.expiry_date < new Date().toISOString().slice(0, 10)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This product offer has expired.' });
    }
    const stockAvailable = Number(offer.available_stock) >= quantity;
    const orderStatus = stockAvailable ? 'Accepted' : 'Interested';

    const orderResult = await client.query(
      `INSERT INTO retail_orders
         (order_number, customer_id, shopkeeper_id, product_id, quantity, unit, unit_price, total_amount, status, shop_decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7::numeric * $5::integer, $8::varchar, CASE WHEN $8::varchar = 'Accepted' THEN CURRENT_TIMESTAMP ELSE NULL END)
       RETURNING id, order_number, quantity, unit, unit_price, total_amount, status, created_at`,
      [makeCode(stockAvailable ? 'ORD' : 'REQ'), req.user.id, shopkeeperId, productId, quantity, offer.unit, offer.unit_price, orderStatus]
    );
    const order = orderResult.rows[0];

    if (stockAvailable) {
      await client.query(
        `UPDATE shop_stock
         SET available_stock = available_stock - $1, updated_at = CURRENT_TIMESTAMP
         WHERE shopkeeper_id = $2 AND product_id = $3`,
        [quantity, shopkeeperId, productId]
      );
    }

    await sendNotification(client, {
      recipientId: shopkeeperId,
      eventType: stockAvailable ? 'RETAIL_ORDER_PLACED' : 'RETAIL_PURCHASE_INTEREST',
      title: stockAvailable ? 'Customer placed a grocery order' : 'Customer requested more grocery stock',
      message: stockAvailable
        ? `${req.user.full_name} placed an order for ${quantity} ${offer.unit} of ${offer.name}.`
        : `${req.user.full_name} requested ${quantity} ${offer.unit} of ${offer.name}; only ${offer.available_stock} are currently listed.`,
      orderId: order.id
    });
    await appendAudit(client, {
      user: req.user,
      action: stockAvailable ? 'RETAIL_ORDER_PLACED' : 'RETAIL_PURCHASE_INTEREST',
      orderId: order.id,
      details: {
        productId,
        shopkeeperId,
        quantity,
        unitPrice: offer.unit_price,
        orderNumber: order.order_number,
        stockAvailable
      },
      ip: req.ip
    });

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: stockAvailable ? 'Order placed and stock reserved.' : 'Quantity request sent to the shopkeeper for review.',
      order,
      remainingStock: Number(offer.available_stock) - (stockAvailable ? quantity : 0)
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getCustomerRetailOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `${orderSelect}
       WHERE ro.customer_id = $1
       ORDER BY ro.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getCustomerRetailOrder = async (req, res, next) => {
  try {
    if (!isPositiveId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'A valid order is required.' });
    }
    const orderResult = await pool.query(
      `${orderSelect}
       WHERE ro.id = $1 AND ro.customer_id = $2`,
      [Number(req.params.id), req.user.id]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const [invoices, receipts] = await Promise.all([
      pool.query(
        `SELECT invoice_number, version, quantity, unit_price, total_amount, issued_at
         FROM retail_invoices WHERE retail_order_id = $1 ORDER BY version DESC`,
        [Number(req.params.id)]
      ),
      pool.query(
        `SELECT received_quantity, is_matched, mismatch_details, confirmed_at
         FROM retail_order_receipts WHERE retail_order_id = $1 ORDER BY id DESC`,
        [Number(req.params.id)]
      )
    ]);
    res.json({
      success: true,
      order: orderResult.rows[0],
      invoices: invoices.rows,
      receipts: receipts.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getShopkeeperRetailOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `${orderSelect}
       WHERE ro.shopkeeper_id = $1
       ORDER BY ro.created_at DESC`,
      [req.user.id]
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};

export const updateRetailInterestStatus = async (req, res, next) => {
  const orderId = Number(req.params.id);
  const { status } = req.body;
  if (!isPositiveId(orderId) || !['Accepted', 'Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Choose a valid order and decision.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT ro.*, p.name AS product_name
       FROM retail_orders ro
       JOIN products p ON p.id = ro.product_id
       WHERE ro.id = $1 AND ro.shopkeeper_id = $2
       FOR UPDATE OF ro`,
      [orderId, req.user.id]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Purchase interest not found for your shop.' });
    }
    const order = orderResult.rows[0];
    if (order.status !== 'Interested') {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This purchase interest has already been handled.' });
    }

    if (status === 'Accepted') {
      const stockResult = await client.query(
        `SELECT ss.available_stock, ss.expiry_date, p.is_active
         FROM shop_stock ss
         JOIN products p ON p.id = ss.product_id
         WHERE ss.shopkeeper_id = $1 AND ss.product_id = $2
         FOR UPDATE OF ss`,
        [req.user.id, order.product_id]
      );
      if (
        stockResult.rows.length === 0 ||
        !stockResult.rows[0].is_active ||
        stockResult.rows[0].expiry_date < new Date().toISOString().slice(0, 10) ||
        Number(stockResult.rows[0].available_stock) < Number(order.quantity)
      ) {
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'The current stock or expiry no longer allows this order.' });
      }
      await client.query(
        `UPDATE shop_stock
         SET available_stock = available_stock - $1, updated_at = CURRENT_TIMESTAMP
         WHERE shopkeeper_id = $2 AND product_id = $3`,
        [order.quantity, req.user.id, order.product_id]
      );
    }

    await client.query(
      `UPDATE retail_orders
       SET status = $1, shop_decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [status, orderId]
    );
    await sendNotification(client, {
      recipientId: order.customer_id,
      eventType: status === 'Accepted' ? 'RETAIL_PURCHASE_ACCEPTED' : 'RETAIL_PURCHASE_REJECTED',
      title: status === 'Accepted' ? 'Shopkeeper accepted your purchase interest' : 'Shopkeeper could not accept your purchase',
      message: `${req.user.full_name} ${status.toLowerCase()} your interest in ${order.product_name}.`,
      orderId
    });
    await appendAudit(client, {
      user: req.user,
      action: `RETAIL_PURCHASE_${status.toUpperCase()}`,
      orderId,
      details: { orderNumber: order.order_number, quantity: order.quantity },
      ip: req.ip
    });

    await client.query('COMMIT');
    res.json({ success: true, message: `Purchase interest ${status.toLowerCase()}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const issueRetailInvoice = async (req, res, next) => {
  const orderId = Number(req.params.id);
  const quantity = Number(req.body.quantity);
  const unitPrice = Number(req.body.unitPrice);
  if (
    !isPositiveId(orderId) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 500 ||
    !Number.isFinite(unitPrice) ||
    unitPrice <= 0
  ) {
    return res.status(400).json({ success: false, message: 'Enter a valid invoice quantity and unit price.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT * FROM retail_orders
       WHERE id = $1 AND shopkeeper_id = $2
       FOR UPDATE`,
      [orderId, req.user.id]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found for your shop.' });
    }
    const order = orderResult.rows[0];
    if (!['Accepted', 'Invoiced', 'ReceiptMismatch', 'ReceiptConfirmed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Accept the purchase interest before issuing an invoice.' });
    }

    const versionResult = await client.query(
      'SELECT COALESCE(MAX(version), 0)::int + 1 AS next_version FROM retail_invoices WHERE retail_order_id = $1',
      [orderId]
    );
    const invoiceResult = await client.query(
      `INSERT INTO retail_invoices
         (invoice_number, retail_order_id, version, shopkeeper_id, quantity, unit_price, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6, $5::integer * $6::numeric)
       RETURNING id, invoice_number, version, quantity, unit_price, total_amount, issued_at`,
      [makeCode('BILL'), orderId, versionResult.rows[0].next_version, req.user.id, quantity, unitPrice]
    );
    const invoice = invoiceResult.rows[0];

    await client.query(
      `UPDATE retail_orders SET status = 'Invoiced', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId]
    );
    await sendNotification(client, {
      recipientId: order.customer_id,
      eventType: 'RETAIL_INVOICE_ISSUED',
      title: 'Your e-bill is ready',
      message: `${invoice.invoice_number} was issued for order ${order.order_number}.`,
      orderId
    });
    await appendAudit(client, {
      user: req.user,
      action: 'RETAIL_INVOICE_ISSUED',
      orderId,
      details: {
        invoiceNumber: invoice.invoice_number,
        version: invoice.version,
        quantity,
        unitPrice,
        totalAmount: invoice.total_amount
      },
      ip: req.ip
    });

    await client.query('COMMIT');
    res.status(201).json({ success: true, invoice });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const confirmRetailReceipt = async (req, res, next) => {
  const orderId = Number(req.params.id);
  const receivedQuantity = Number(req.body.receivedQuantity);
  if (!isPositiveId(orderId) || !Number.isSafeInteger(receivedQuantity) || receivedQuantity < 0 || receivedQuantity > 500) {
    return res.status(400).json({ success: false, message: 'Enter a received quantity from 0 to 500.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT * FROM retail_orders WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
      [orderId, req.user.id]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orderResult.rows[0];
    if (!['Invoiced', 'ReceiptMismatch', 'ReceiptConfirmed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'The shopkeeper must issue an invoice before receipt confirmation.' });
    }
    const invoice = await getLatestInvoice(client, orderId);
    const receipt = { received_quantity: receivedQuantity };
    const match = compareRetailOrder(order, receipt, invoice);
    const mismatchDetails = match.discrepancies.join(' ');
    const receiptResult = await client.query(
      `INSERT INTO retail_order_receipts
         (retail_order_id, customer_id, received_quantity, is_matched, mismatch_details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, received_quantity, is_matched, mismatch_details, confirmed_at`,
      [orderId, req.user.id, receivedQuantity, match.matched, mismatchDetails || null]
    );

    await client.query(
      `UPDATE retail_orders
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [match.matched ? 'ReceiptConfirmed' : 'ReceiptMismatch', orderId]
    );
    await appendAudit(client, {
      user: req.user,
      action: match.matched ? 'RETAIL_RECEIPT_MATCHED' : 'RETAIL_RECEIPT_MISMATCH',
      orderId,
      details: { receivedQuantity, discrepancies: match.discrepancies },
      ip: req.ip
    });
    await sendNotification(client, {
      recipientId: order.shopkeeper_id,
      eventType: match.matched ? 'RETAIL_RECEIPT_CONFIRMED' : 'RETAIL_RECEIPT_MISMATCH',
      title: match.matched ? 'Customer confirmed receipt' : 'Customer receipt does not match the order',
      message: match.matched
        ? `Receipt confirmed for order ${order.order_number}.`
        : `Order ${order.order_number} needs attention: ${mismatchDetails}`,
      orderId
    });

    await client.query('COMMIT');
    res.status(match.matched ? 200 : 409).json({
      success: match.matched,
      matched: match.matched,
      discrepancies: match.discrepancies,
      receipt: receiptResult.rows[0],
      message: match.matched ? 'Order, receipt, and invoice match.' : 'Receipt mismatch. Payment is blocked until the records match.'
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const recordRetailPayment = async (req, res, next) => {
  const orderId = Number(req.params.id);
  const paymentMethod = typeof req.body.paymentMethod === 'string' ? req.body.paymentMethod.trim() : '';
  const referenceNumber = typeof req.body.referenceNumber === 'string' ? req.body.referenceNumber.trim() : '';
  if (!isPositiveId(orderId) || !supportedPaymentMethods.has(paymentMethod)) {
    return res.status(400).json({ success: false, message: 'Choose a supported payment method.' });
  }
  if (paymentMethod !== 'Cash' && !referenceNumber) {
    return res.status(400).json({ success: false, message: 'Enter the payment reference for this method.' });
  }
  if (referenceNumber.length > 100) {
    return res.status(400).json({ success: false, message: 'Payment reference must be 100 characters or fewer.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderResult = await client.query(
      `SELECT * FROM retail_orders WHERE id = $1 AND customer_id = $2 FOR UPDATE`,
      [orderId, req.user.id]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    const order = orderResult.rows[0];
    const invoice = await getLatestInvoice(client, orderId);
    const receipt = await getLatestReceipt(client, orderId);
    const match = compareRetailOrder(order, receipt, invoice);
    if (order.status !== 'ReceiptConfirmed' || !match.matched || !receipt.is_matched) {
      const discrepancies = match.discrepancies.length
        ? match.discrepancies
        : ['Customer receipt confirmation is required before payment.'];
      await appendAudit(client, {
        user: req.user,
        action: 'RETAIL_PAYMENT_BLOCKED',
        orderId,
        details: { discrepancies },
        ip: req.ip
      });
      await client.query('COMMIT');
      return res.status(409).json({
        success: false,
        message: 'Payment is blocked until the order, customer receipt, and shopkeeper invoice match.',
        discrepancies
      });
    }

    const existingPayment = await client.query(
      'SELECT id FROM retail_payments WHERE retail_order_id = $1',
      [orderId]
    );
    if (existingPayment.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Payment has already been recorded for this order.' });
    }

    const paymentResult = await client.query(
      `INSERT INTO retail_payments
         (payment_number, retail_order_id, invoice_id, customer_id, shopkeeper_id, amount, payment_method, reference_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, payment_number, amount, payment_method, reference_number, payment_date`,
      [makeCode('PAY'), orderId, invoice.id, req.user.id, order.shopkeeper_id, invoice.total_amount, paymentMethod, referenceNumber || null]
    );
    const payment = paymentResult.rows[0];
    await client.query(
      `UPDATE retail_orders SET status = 'Completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId]
    );
    await appendAudit(client, {
      user: req.user,
      action: 'RETAIL_PAYMENT_RECORDED',
      orderId,
      details: {
        paymentNumber: payment.payment_number,
        invoiceNumber: invoice.invoice_number,
        amount: payment.amount,
        paymentMethod
      },
      ip: req.ip
    });
    await sendNotification(client, {
      recipientId: order.shopkeeper_id,
      eventType: 'RETAIL_PAYMENT_RECORDED',
      title: 'Customer recorded payment',
      message: `${payment.payment_number} was recorded for order ${order.order_number}.`,
      orderId
    });

    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Payment recorded and the order is complete.', payment });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getCustomerPayments = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        payment.id,
        payment.payment_number,
        payment.amount,
        payment.payment_method,
        payment.reference_number,
        payment.payment_date,
        order_record.id AS order_id,
        order_record.order_number,
        order_record.quantity,
        order_record.unit,
        product.name AS product_name,
        invoice.id AS invoice_id,
        invoice.invoice_number,
        invoice.unit_price,
        shop_profile.store_name,
        shop_profile.branch
       FROM retail_payments payment
       JOIN retail_orders order_record ON order_record.id = payment.retail_order_id
       JOIN products product ON product.id = order_record.product_id
       JOIN retail_invoices invoice ON invoice.id = payment.invoice_id
       JOIN shopkeeper_profiles shop_profile ON shop_profile.user_id = payment.shopkeeper_id
       WHERE payment.customer_id = $1
       ORDER BY payment.payment_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, payments: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getCustomerEBill = async (req, res, next) => {
  try {
    if (!isPositiveId(req.params.paymentId)) {
      return res.status(400).json({ success: false, message: 'A valid payment is required.' });
    }
    const result = await pool.query(
      `SELECT
        payment.id AS payment_id,
        payment.payment_number,
        payment.amount AS paid_amount,
        payment.payment_method,
        payment.reference_number,
        payment.payment_date,
        order_record.order_number,
        order_record.quantity,
        order_record.unit,
        product.name AS product_name,
        invoice.invoice_number,
        invoice.version AS invoice_version,
        invoice.quantity AS invoice_quantity,
        invoice.unit_price,
        invoice.total_amount,
        invoice.issued_at,
        customer.full_name AS customer_name,
        customer.email AS customer_email,
        shop_profile.store_name,
        shop_profile.branch,
        shop_profile.address AS shop_address
       FROM retail_payments payment
       JOIN retail_orders order_record ON order_record.id = payment.retail_order_id
       JOIN retail_invoices invoice ON invoice.id = payment.invoice_id
       JOIN products product ON product.id = order_record.product_id
       JOIN users customer ON customer.id = payment.customer_id
       JOIN shopkeeper_profiles shop_profile ON shop_profile.user_id = payment.shopkeeper_id
       WHERE payment.id = $1 AND payment.customer_id = $2`,
      [Number(req.params.paymentId), req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'E-bill not found.' });
    }
    res.json({ success: true, bill: result.rows[0] });
  } catch (err) {
    next(err);
  }
};
