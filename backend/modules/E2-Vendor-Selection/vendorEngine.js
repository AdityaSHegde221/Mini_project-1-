import pool from '../../config/db.js';

export class VendorDecisionEngine {
  static async evaluateVendorBasket(items, client = pool) {
    const startTime = Date.now();
    const productIds = items.map((item) => item.productId);
    const [productsResult, vendorsResult, stockResult] = await Promise.all([
      client.query(
        `SELECT id, name, category, unit FROM products WHERE is_active = TRUE AND id = ANY($1::bigint[])`,
        [productIds]
      ),
      client.query(
        `SELECT v.id AS vendor_id, v.full_name AS vendor_name, v.email AS vendor_email,
                vp.company_name, vp.rating, vp.contact_person, vp.address
         FROM users v
         LEFT JOIN vendor_profiles vp ON vp.user_id = v.id
         WHERE v.role = 'Vendor' AND v.is_active = TRUE
         ORDER BY v.full_name`
      ),
      client.query(
        `SELECT vendor_id, product_id, available_stock, unit_price, lead_time_days
         FROM vendor_stock
         WHERE product_id = ANY($1::bigint[])`,
        [productIds]
      )
    ]);

    const productsById = new Map(productsResult.rows.map((product) => [String(product.id), product]));
    if (productsById.size !== items.length) {
      const error = new Error('One or more selected products are unavailable in the active catalog.');
      error.statusCode = 400;
      throw error;
    }

    const requestedItems = items.map((item) => ({
      ...productsById.get(String(item.productId)),
      productId: item.productId,
      requiredQuantity: item.quantity
    }));
    const stockByVendor = new Map();
    for (const stock of stockResult.rows) {
      const vendorKey = String(stock.vendor_id);
      if (!stockByVendor.has(vendorKey)) stockByVendor.set(vendorKey, new Map());
      stockByVendor.get(vendorKey).set(String(stock.product_id), stock);
    }

    const vendors = vendorsResult.rows.map((vendor) => {
      const stock = stockByVendor.get(String(vendor.vendor_id)) || new Map();
      const itemResults = requestedItems.map((item) => {
        const listing = stock.get(String(item.productId));
        const availableStock = Number(listing?.available_stock || 0);
        const unitPrice = listing ? Number(listing.unit_price) : null;
        const leadTimeDays = listing ? Number(listing.lead_time_days || 0) : null;
        return {
          product_id: item.productId,
          product_name: item.name,
          unit: item.unit,
          required_quantity: item.requiredQuantity,
          available_stock: availableStock,
          unit_price: unitPrice,
          line_total: listing ? unitPrice * item.requiredQuantity : null,
          lead_time_days: leadTimeDays,
          is_eligible: availableStock >= item.requiredQuantity
        };
      });
      const isEligible = itemResults.every((item) => item.is_eligible);
      const pricedItems = itemResults.filter((item) => item.line_total !== null);
      return {
        ...vendor,
        is_eligible: isEligible,
        item_results: itemResults,
        total_price: pricedItems.reduce((total, item) => total + item.line_total, 0),
        max_lead_time_days: pricedItems.length
          ? Math.max(...pricedItems.map((item) => item.lead_time_days))
          : null
      };
    });

    const eligibleVendors = vendors
      .filter((vendor) => vendor.is_eligible)
      .sort((a, b) => a.total_price - b.total_price
        || a.max_lead_time_days - b.max_lead_time_days
        || a.vendor_name.localeCompare(b.vendor_name));
    const recommendedVendorId = eligibleVendors[0]?.vendor_id ?? null;

    return {
      items: requestedItems,
      totalVendors: vendors.length,
      eligibleCount: eligibleVendors.length,
      hasEligibleVendor: eligibleVendors.length > 0,
      recommendedVendorId,
      executionTimeMs: Date.now() - startTime,
      message: eligibleVendors.length
        ? `Found ${eligibleVendors.length} vendor(s) able to fulfill the complete basket from one supplier.`
        : 'No single vendor can fulfill every product and quantity in this basket.',
      vendors: vendors
        .map((vendor) => ({
          ...vendor,
          is_recommended: vendor.vendor_id === recommendedVendorId
        }))
        .sort((a, b) => Number(b.is_eligible) - Number(a.is_eligible)
          || (a.is_eligible && b.is_eligible ? a.total_price - b.total_price : a.vendor_name.localeCompare(b.vendor_name)))
    };
  }

  /**
   * Evaluates all vendors supplying a specific product against required quantity.
   * Enforces Single-Vendor Rule: available_stock >= required_quantity.
   * Ranks eligible vendors by unit_price ASC (lowest price recommendation).
   */
  static async evaluateVendors(productId, requiredQuantity, client = pool) {
    const startTime = Date.now();

    const sql = `
      SELECT 
        v.id AS vendor_id,
        v.full_name AS vendor_name,
        v.email AS vendor_email,
        vp.company_name,
        vp.rating,
        vp.contact_person,
        vp.address,
        vs.available_stock,
        vs.unit_price,
        vs.lead_time_days,
        (vs.unit_price * $2) AS total_price,
        CASE 
          WHEN vs.available_stock >= $2 THEN TRUE 
          ELSE FALSE 
        END AS is_eligible,
        CASE 
          WHEN vs.available_stock >= $2 THEN 'Stock sufficient for full quantity' 
          ELSE 'Insufficient stock (cannot supply full requested quantity)' 
        END AS eligibility_reason
      FROM vendor_stock vs
      JOIN users v ON vs.vendor_id = v.id
      LEFT JOIN vendor_profiles vp ON v.id = vp.user_id
      WHERE vs.product_id = $1 AND v.is_active = TRUE
      ORDER BY vs.unit_price ASC;
    `;

    const result = await client.query(sql, [productId, requiredQuantity]);
    const executionTimeMs = Date.now() - startTime;

    const vendors = result.rows;
    const eligibleVendors = vendors.filter(v => v.is_eligible);

    // Identify recommended vendor (lowest unit price among eligible)
    let recommendedVendorId = null;
    if (eligibleVendors.length > 0) {
      recommendedVendorId = eligibleVendors[0].vendor_id;
    }

    const vendorsWithRecommendation = vendors.map(v => ({
      ...v,
      is_recommended: v.vendor_id === recommendedVendorId
    }));

    return {
      productId,
      requiredQuantity,
      totalVendors: vendors.length,
      eligibleCount: eligibleVendors.length,
      hasEligibleVendor: eligibleVendors.length > 0,
      recommendedVendorId,
      executionTimeMs,
      message: eligibleVendors.length > 0
        ? `Found ${eligibleVendors.length} eligible vendor(s) able to fulfill complete order.`
        : 'No single vendor can fulfil the complete requested quantity.',
      vendors: vendorsWithRecommendation
    };
  }

  /**
   * Validate if a selected vendor is eligible for the complete quantity
   */
  static async validateVendorEligibility(vendorId, productId, requiredQuantity, client = pool) {
    const res = await client.query(
      `SELECT available_stock, unit_price FROM vendor_stock 
       WHERE vendor_id = $1 AND product_id = $2`,
      [vendorId, productId]
    );

    if (res.rows.length === 0) {
      const err = new Error('Selected vendor does not supply this product.');
      err.statusCode = 400;
      throw err;
    }

    const { available_stock, unit_price } = res.rows[0];
    if (available_stock < requiredQuantity) {
      const err = new Error(
        `Vendor selection rejected: Available stock (${available_stock}) is less than required quantity (${requiredQuantity}). Single-vendor rule violated.`
      );
      err.statusCode = 400;
      throw err;
    }

    return { eligible: true, availableStock: available_stock, unitPrice: unit_price };
  }
}

export default VendorDecisionEngine;
