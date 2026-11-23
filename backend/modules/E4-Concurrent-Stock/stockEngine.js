import { randomUUID } from 'node:crypto';
import pool from '../../config/db.js';
import WorkflowEngine, { WORKFLOW_STATES } from '../E1-Workflow/workflowEngine.js';

export class ConcurrentStockEngine {
  static async respondToBasketEnquiry({ enquiryId, vendorId, status, comments = '', ip = '127.0.0.1' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const enquiryResult = await client.query(
        `SELECT id, enquiry_code, shopkeeper_id, vendor_id, status
         FROM vendor_basket_enquiries
         WHERE id = $1 AND vendor_id = $2
         FOR UPDATE`,
        [enquiryId, vendorId]
      );
      if (enquiryResult.rows.length === 0) {
        const error = new Error('Restock enquiry not found for this vendor.');
        error.statusCode = 404;
        throw error;
      }
      const enquiry = enquiryResult.rows[0];
      if (enquiry.status !== 'Sent') {
        const error = new Error('This restock enquiry has already been handled.');
        error.statusCode = 409;
        throw error;
      }

      const itemResult = await client.query(
        `SELECT item.id, item.request_id, item.product_id, item.quantity,
                product.name AS product_name, product.unit
         FROM vendor_basket_enquiry_items item
         JOIN products product ON product.id = item.product_id
         WHERE item.basket_enquiry_id = $1
         ORDER BY item.product_id`,
        [enquiryId]
      );
      if (itemResult.rows.length === 0) {
        const error = new Error('This restock enquiry contains no products.');
        error.statusCode = 409;
        throw error;
      }

      if (status === 'Declined') {
        await client.query(
          `UPDATE vendor_basket_enquiries
           SET status = 'Declined', vendor_decision = 'Declined', vendor_comments = $1,
               responded_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [comments, enquiryId]
        );
        await WorkflowEngine.sendNotification({
          recipientId: enquiry.shopkeeper_id,
          eventType: 'VENDOR_BASKET_DECLINED',
          title: 'Vendor declined restock request',
          message: `Vendor declined restock request ${enquiry.enquiry_code}.${comments ? ` ${comments}` : ''}`,
          relatedEntityType: 'vendor_basket_enquiries',
          relatedEntityId: enquiryId,
          client
        });
        await WorkflowEngine.logAudit({
          actorId: vendorId,
          actorRole: 'Vendor',
          action: 'DECLINE_VENDOR_BASKET_ENQUIRY',
          entityType: 'vendor_basket_enquiries',
          entityId: enquiryId,
          details: { enquiryCode: enquiry.enquiry_code, comments },
          ip,
          client
        });
        await client.query('COMMIT');
        return { status: 'Declined', purchaseOrders: [] };
      }

      const productIds = itemResult.rows.map((item) => item.product_id);
      const stockResult = await client.query(
        `SELECT vs.id, vs.product_id, vs.available_stock, vs.unit_price, vs.lead_time_days
         FROM vendor_stock vs
         JOIN users vendor ON vendor.id = vs.vendor_id
           AND vendor.role = 'Vendor' AND vendor.is_active = TRUE
         WHERE vs.vendor_id = $1 AND vs.product_id = ANY($2::bigint[])
         ORDER BY vs.product_id
         FOR UPDATE OF vs`,
        [vendorId, productIds]
      );
      if (stockResult.rows.length !== itemResult.rows.length) {
        const error = new Error('You no longer stock every product in this request, so it cannot be approved.');
        error.statusCode = 409;
        throw error;
      }
      const stocks = new Map(stockResult.rows.map((stock) => [String(stock.product_id), stock]));
      const unavailable = itemResult.rows.filter((item) => Number(stocks.get(String(item.product_id))?.available_stock) < Number(item.quantity));
      if (unavailable.length) {
        const missing = unavailable.map((item) => `${item.product_name}: need ${item.quantity}, available ${stocks.get(String(item.product_id))?.available_stock ?? 0}`).join('; ');
        const error = new Error(`Cannot approve the whole basket because stock is insufficient. ${missing}`);
        error.statusCode = 409;
        throw error;
      }

      const requestIds = itemResult.rows.map((item) => item.request_id);
      const requestResult = await client.query(
        `SELECT id, request_code, customer_id, product_id, quantity, status
         FROM purchase_requests
         WHERE id = ANY($1::bigint[])
         ORDER BY id
         FOR UPDATE`,
        [requestIds]
      );
      if (requestResult.rows.length !== itemResult.rows.length
        || requestResult.rows.some((request) => !['Approved', 'Vendor Selected'].includes(request.status))) {
        const error = new Error('One or more linked restock requests are no longer available.');
        error.statusCode = 409;
        throw error;
      }
      const requests = new Map(requestResult.rows.map((request) => [String(request.id), request]));
      const invalidRequestLinks = itemResult.rows.filter((item) => {
        const request = requests.get(String(item.request_id));
        return !request
          || String(request.customer_id) !== String(enquiry.shopkeeper_id)
          || Number(request.product_id) !== Number(item.product_id)
          || Number(request.quantity) !== Number(item.quantity);
      });
      if (invalidRequestLinks.length) {
        const error = new Error('A restock request no longer matches the shop, product, or quantity in this basket.');
        error.statusCode = 409;
        throw error;
      }
      const warehouseResult = await client.query(
        `SELECT id FROM users WHERE role = 'Warehouse' AND is_active = TRUE LIMIT 1`
      );
      const purchaseOrders = [];

      for (const item of itemResult.rows) {
        const stock = stocks.get(String(item.product_id));
        const request = requests.get(String(item.request_id));
        const unitPrice = Number(stock.unit_price);
        const quantity = Number(item.quantity);
        const totalAmount = unitPrice * quantity;
        const remainingStock = Number(stock.available_stock) - quantity;
        await client.query(
          `UPDATE vendor_stock
           SET available_stock = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [remainingStock, stock.id]
        );
        const poNumber = `PO-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
        const poResult = await client.query(
          `INSERT INTO purchase_orders
             (po_number, request_id, shopkeeper_id, vendor_id, product_id, quantity, unit_price, total_amount, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Confirmed')
           RETURNING *`,
          [poNumber, request.id, enquiry.shopkeeper_id, vendorId, item.product_id, quantity, unitPrice, totalAmount]
        );
        const purchaseOrder = poResult.rows[0];
        await client.query(
          `INSERT INTO stock_reservations (po_id, vendor_id, product_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [purchaseOrder.id, vendorId, item.product_id, quantity]
        );
        await client.query(
          `UPDATE purchase_requests
           SET status = 'Ordered', selected_vendor_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [vendorId, request.id]
        );
        await client.query(
          `UPDATE vendor_basket_enquiry_items
           SET quoted_unit_price = $1, available_quantity = $2, estimated_days = $3, purchase_order_id = $4
           WHERE id = $5`,
          [unitPrice, stock.available_stock, stock.lead_time_days, purchaseOrder.id, item.id]
        );
        await WorkflowEngine.sendNotification({
          recipientId: enquiry.shopkeeper_id,
          eventType: 'VENDOR_BASKET_APPROVED',
          title: 'Vendor approved and dispatched your restock order',
          message: `${item.product_name}: ${quantity} ${item.unit} approved under ${poNumber}.`,
          relatedEntityType: 'purchase_orders',
          relatedEntityId: purchaseOrder.id,
          client
        });
        if (warehouseResult.rows.length) {
          await WorkflowEngine.sendNotification({
            recipientId: warehouseResult.rows[0].id,
            eventType: 'INCOMING_SHIPMENT_EXPECTED',
            title: 'Incoming Shipment Expected',
            message: `Purchase Order ${poNumber} (${quantity} ${item.unit}) is scheduled for receipt.`,
            relatedEntityType: 'purchase_orders',
            relatedEntityId: purchaseOrder.id,
            client
          });
        }
        await WorkflowEngine.logAudit({
          actorId: vendorId,
          actorRole: 'Vendor',
          action: 'APPROVE_AND_ORDER_VENDOR_BASKET_ITEM',
          entityType: 'purchase_orders',
          entityId: purchaseOrder.id,
          details: {
            enquiryCode: enquiry.enquiry_code,
            poNumber,
            productId: item.product_id,
            quantity,
            unitPrice,
            remainingStock
          },
          ip,
          client
        });
        purchaseOrders.push(purchaseOrder);
      }

      await client.query(
        `UPDATE vendor_basket_enquiries
         SET status = 'Ordered', vendor_decision = 'Approved', vendor_comments = $1,
             approved_at = CURRENT_TIMESTAMP, responded_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [comments, enquiryId]
      );
      await client.query('COMMIT');
      return { status: 'Ordered', purchaseOrders };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async reserveBasketAndCreatePOs({ items, shopkeeperId, vendorId, ip = '127.0.0.1' }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const requestIds = items.map((item) => item.requestId);
      const productIds = items.map((item) => item.productId);
      const requestsResult = await client.query(
        `SELECT pr.id, pr.request_code, pr.customer_id, pr.product_id, pr.quantity, pr.status
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
        [requestIds, shopkeeperId]
      );
      if (requestsResult.rows.length !== items.length) {
        const error = new Error('Every restock line must link to an Approved Request assigned to your shop.');
        error.statusCode = 403;
        throw error;
      }

      const requestsById = new Map(requestsResult.rows.map((request) => [String(request.id), request]));
      for (const item of items) {
        const request = requestsById.get(String(item.requestId));
        if (!request || !['Approved', 'Vendor Selected'].includes(request.status)) {
          const error = new Error(`Request ${item.requestId} is no longer available for ordering.`);
          error.statusCode = 409;
          throw error;
        }
        if (Number(request.product_id) !== Number(item.productId)
          || Number(request.quantity) !== Number(item.quantity)) {
          const error = new Error(`Product or quantity does not match approved request ${request.request_code}.`);
          error.statusCode = 400;
          throw error;
        }
      }

      const stockResult = await client.query(
        `SELECT vs.id, vs.product_id, vs.available_stock, vs.unit_price
         FROM vendor_stock vs
         JOIN users vendor ON vendor.id = vs.vendor_id
           AND vendor.role = 'Vendor' AND vendor.is_active = TRUE
         WHERE vs.vendor_id = $1 AND vs.product_id = ANY($2::bigint[])
         ORDER BY vs.product_id
         FOR UPDATE OF vs`,
        [vendorId, productIds]
      );
      if (stockResult.rows.length !== items.length) {
        const error = new Error('The selected vendor no longer stocks every product in this basket.');
        error.statusCode = 409;
        throw error;
      }
      const stockByProduct = new Map(stockResult.rows.map((stock) => [String(stock.product_id), stock]));
      for (const item of items) {
        const stock = stockByProduct.get(String(item.productId));
        if (!stock || Number(stock.available_stock) < item.quantity) {
          const error = new Error(`Vendor stock changed. Required ${item.quantity} units for product ${item.productId}; available ${stock?.available_stock || 0}. Nothing was ordered.`);
          error.statusCode = 409;
          throw error;
        }
      }

      const warehouseResult = await client.query(
        `SELECT id FROM users WHERE role = 'Warehouse' AND is_active = TRUE LIMIT 1`
      );
      const purchaseOrders = [];
      const remainingStocks = [];
      for (const item of items) {
        const request = requestsById.get(String(item.requestId));
        const stock = stockByProduct.get(String(item.productId));
        const unitPrice = Number(stock.unit_price);
        const totalAmount = unitPrice * Number(item.quantity);
        const stockAfterOrder = Number(stock.available_stock) - Number(item.quantity);
        await client.query(
          `UPDATE vendor_stock
           SET available_stock = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [stockAfterOrder, stock.id]
        );

        const poNumber = `PO-${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
        const poResult = await client.query(
          `INSERT INTO purchase_orders
             (po_number, request_id, shopkeeper_id, vendor_id, product_id, quantity, unit_price, total_amount, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Confirmed')
           RETURNING *`,
          [poNumber, request.id, shopkeeperId, vendorId, item.productId, item.quantity, unitPrice, totalAmount]
        );
        const purchaseOrder = poResult.rows[0];
        await client.query(
          `INSERT INTO stock_reservations (po_id, vendor_id, product_id, quantity)
           VALUES ($1, $2, $3, $4)`,
          [purchaseOrder.id, vendorId, item.productId, item.quantity]
        );
        await client.query(
          `UPDATE purchase_requests
           SET status = 'Ordered', selected_vendor_id = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [vendorId, request.id]
        );

        await WorkflowEngine.sendNotification({
          recipientId: vendorId,
          eventType: 'PO_CONFIRMED',
          title: 'New Confirmed Purchase Order',
          message: `Purchase Order ${poNumber} for ${item.quantity} unit(s) has been confirmed by shopkeeper. Stock reserved.`,
          relatedEntityType: 'purchase_orders',
          relatedEntityId: purchaseOrder.id,
          client
        });
        if (warehouseResult.rows.length > 0) {
          await WorkflowEngine.sendNotification({
            recipientId: warehouseResult.rows[0].id,
            eventType: 'INCOMING_SHIPMENT_EXPECTED',
            title: 'Incoming Shipment Expected',
            message: `Confirmed PO ${poNumber} (${item.quantity} units) is scheduled for warehouse receipt.`,
            relatedEntityType: 'purchase_orders',
            relatedEntityId: purchaseOrder.id,
            client
          });
        }
        await WorkflowEngine.sendNotification({
          recipientId: request.customer_id,
          eventType: 'REQUEST_ORDERED',
          title: 'Purchase Order Placed with Vendor',
          message: `Your request ${request.request_code} has been confirmed and placed with vendor under ${poNumber}.`,
          relatedEntityType: 'purchase_requests',
          relatedEntityId: request.id,
          client
        });
        await WorkflowEngine.logAudit({
          actorId: shopkeeperId,
          actorRole: 'Shopkeeper',
          action: 'PLACE_ORDER',
          entityType: 'purchase_orders',
          entityId: purchaseOrder.id,
          details: {
            poNumber,
            requestId: request.id,
            vendorId,
            productId: item.productId,
            quantity: item.quantity,
            previousStock: stock.available_stock,
            newStock: stockAfterOrder
          },
          ip,
          client
        });
        purchaseOrders.push(purchaseOrder);
        remainingStocks.push({ productId: item.productId, availableStock: stockAfterOrder });
      }

      await client.query('COMMIT');
      return { purchaseOrders, remainingStocks };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Concurrently safe stock reservation and Purchase Order creation.
   * Utilizes PostgreSQL Row-Level Locking (SELECT ... FOR UPDATE) inside an ACID transaction.
   * Guarantees zero overselling and prevents race conditions.
   */
  static async reserveStockAndCreatePO({
    requestId,
    shopkeeperId,
    vendorId,
    productId,
    quantity,
    ip = '127.0.0.1'
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Verify Purchase Request is in valid state (Approved or Vendor Selected)
      const reqRes = await client.query(
        `SELECT id, request_code, customer_id, product_id, quantity, status 
         FROM purchase_requests WHERE id = $1 FOR UPDATE`,
        [requestId]
      );

      if (reqRes.rows.length === 0) {
        const err = new Error('Purchase Request not found.');
        err.statusCode = 404;
        throw err;
      }

      const request = reqRes.rows[0];

      if (!['Approved', 'Vendor Selected'].includes(request.status)) {
        const err = new Error(
          `Cannot place purchase order for request in '${request.status}' status. Must be 'Approved' or 'Vendor Selected'.`
        );
        err.statusCode = 400;
        throw err;
      }

      if (Number(request.quantity) !== Number(quantity)) {
        const err = new Error(
          `Order quantity (${quantity}) does not match request quantity (${request.quantity}). Splitting is not permitted.`
        );
        err.statusCode = 400;
        throw err;
      }

      // 2. CRITICAL CONCURRENCY LOCK: SELECT ... FOR UPDATE on vendor stock
      // This locks the exact vendor stock row in PostgreSQL until this transaction commits or rolls back
      const stockRes = await client.query(
        `SELECT id, available_stock, unit_price 
         FROM vendor_stock 
         WHERE vendor_id = $1 AND product_id = $2 
         FOR UPDATE`,
        [vendorId, productId]
      );

      if (stockRes.rows.length === 0) {
        const err = new Error('Vendor does not stock this product.');
        err.statusCode = 400;
        throw err;
      }

      const currentStock = stockRes.rows[0].available_stock;
      const unitPrice = Number(stockRes.rows[0].unit_price);
      const totalAmount = unitPrice * quantity;

      // 3. Revalidate available stock under the lock
      if (currentStock < quantity) {
        const err = new Error(
          `Stock reservation failed due to concurrent order. Required: ${quantity}, Available: ${currentStock}. Order aborted.`
        );
        err.statusCode = 409; // Conflict
        throw err;
      }

      // 4. Safely decrement vendor stock
      await client.query(
        `UPDATE vendor_stock 
         SET available_stock = available_stock - $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [quantity, stockRes.rows[0].id]
      );

      // 5. Generate PO Number and Create Purchase Order
      const poNumber = `PO-${Date.now().toString().slice(-6)}`;
      const poRes = await client.query(
        `INSERT INTO purchase_orders (
          po_number, request_id, shopkeeper_id, vendor_id, product_id,
          quantity, unit_price, total_amount, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Confirmed')
        RETURNING *`,
        [poNumber, requestId, shopkeeperId, vendorId, productId, quantity, unitPrice, totalAmount]
      );

      const po = poRes.rows[0];

      // 6. Record Stock Reservation linking to PO
      await client.query(
        `INSERT INTO stock_reservations (po_id, vendor_id, product_id, quantity)
         VALUES ($1, $2, $3, $4)`,
        [po.id, vendorId, productId, quantity]
      );

      // 7. Update Request Status to 'Ordered' and link selected vendor
      await client.query(
        `UPDATE purchase_requests 
         SET status = 'Ordered', selected_vendor_id = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [vendorId, requestId]
      );

      // 8. Dispatch notifications to Vendor and Warehouse
      // Notify Vendor
      await WorkflowEngine.sendNotification({
        recipientId: vendorId,
        eventType: 'PO_CONFIRMED',
        title: 'New Confirmed Purchase Order',
        message: `Purchase Order ${poNumber} for ${quantity} unit(s) has been confirmed by shopkeeper. Stock reserved.`,
        relatedEntityType: 'purchase_orders',
        relatedEntityId: po.id,
        client
      });

      // Notify Warehouse staff
      const whRes = await client.query(
        `SELECT id FROM users WHERE role = 'Warehouse' AND is_active = TRUE LIMIT 1`
      );
      if (whRes.rows.length > 0) {
        await WorkflowEngine.sendNotification({
          recipientId: whRes.rows[0].id,
          eventType: 'INCOMING_SHIPMENT_EXPECTED',
          title: 'Incoming Shipment Expected',
          message: `Confirmed PO ${poNumber} (${quantity} units) is scheduled for warehouse receipt.`,
          relatedEntityType: 'purchase_orders',
          relatedEntityId: po.id,
          client
        });
      }

      // Notify Customer
      await WorkflowEngine.sendNotification({
        recipientId: request.customer_id,
        eventType: 'REQUEST_ORDERED',
        title: 'Purchase Order Placed with Vendor',
        message: `Your request ${request.request_code} has been confirmed and placed with vendor under ${poNumber}.`,
        relatedEntityType: 'purchase_requests',
        relatedEntityId: requestId,
        client
      });

      // 9. Write Audit Log
      await WorkflowEngine.logAudit({
        actorId: shopkeeperId,
        actorRole: 'Shopkeeper',
        action: 'PLACE_ORDER',
        entityType: 'purchase_orders',
        entityId: po.id,
        details: {
          poNumber,
          requestId,
          vendorId,
          productId,
          quantity,
          previousStock: currentStock,
          newStock: currentStock - quantity
        },
        ip,
        client
      });

      // 10. COMMIT TRANSACTION
      await client.query('COMMIT');

      return {
        success: true,
        purchaseOrder: po,
        remainingStock: currentStock - quantity
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

export default ConcurrentStockEngine;
