import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

const isPositiveId = (id) => Number.isSafeInteger(Number(id)) && Number(id) > 0;

export const createAdminUser = async (req, res, next) => {
  const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Provide a name, valid email, and password with at least 8 characters.'
    });
  }

  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    const existing = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const inserted = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name)
       VALUES ($1, $2, 'Admin', $3)
       RETURNING id, email, role, full_name, is_active, created_at`,
      [email, passwordHash, fullName]
    );
    const newAdmin = inserted.rows[0];
    await client.query(
      `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'Admin', 'CREATE_ADMIN_USER', 'users', $2, $3, $4)`,
      [req.user.id, newAdmin.id, JSON.stringify({ email: newAdmin.email }), req.ip || '127.0.0.1']
    );
    await client.query('COMMIT');
    transactionStarted = false;
    return res.status(201).json({ success: true, user: newAdmin });
  } catch (err) {
    if (transactionStarted) await client.query('ROLLBACK');
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }
    return next(err);
  } finally {
    client.release();
  }
};

const parseRetailValues = ({ availableStock, unitPrice, expiryDate }) => {
  const stock = Number(availableStock);
  const price = Number(unitPrice);
  const parsedExpiry = new Date(`${expiryDate}T00:00:00Z`);

  if (
    availableStock === undefined ||
    availableStock === null ||
    String(availableStock).trim() === '' ||
    !Number.isSafeInteger(stock) ||
    stock < 0
  ) {
    return { error: 'Stock must be a non-negative whole number.' };
  }

  if (
    unitPrice === undefined ||
    unitPrice === null ||
    String(unitPrice).trim() === '' ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return { error: 'Price must be greater than zero.' };
  }

  if (
    typeof expiryDate !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate) ||
    Number.isNaN(parsedExpiry.getTime()) ||
    parsedExpiry.toISOString().slice(0, 10) !== expiryDate
  ) {
    return { error: 'Enter a valid expiry date.' };
  }

  return { availableStock: stock, unitPrice: price, expiryDate };
};

export const getOverview = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS user_count,
        (SELECT COUNT(*) FROM shopkeeper_profiles)::int AS shop_count,
        (SELECT COUNT(*) FROM products WHERE is_active = TRUE)::int AS active_product_count,
        (SELECT COUNT(*) FROM shop_stock)::int AS shop_listing_count,
        (SELECT COUNT(*) FROM purchase_requests)::int AS request_count,
        (SELECT COUNT(*) FROM purchase_orders)::int AS order_count
    `);
    res.json({ success: true, overview: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.role,
        u.is_active,
        u.created_at,
        sp.store_name,
        sp.branch
       FROM users u
       LEFT JOIN shopkeeper_profiles sp ON sp.user_id = u.id
       ORDER BY u.role, u.full_name`
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getShops = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        sp.user_id,
        sp.store_name,
        sp.branch,
        sp.address,
        sp.latitude,
        sp.longitude,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.is_active,
        COUNT(ss.product_id)::int AS listing_count
       FROM shopkeeper_profiles sp
       JOIN users u ON u.id = sp.user_id
       LEFT JOIN shop_stock ss ON ss.shopkeeper_id = sp.user_id
       GROUP BY sp.user_id, u.full_name, u.email, u.is_active, sp.store_name, sp.branch,
                sp.address, sp.latitude, sp.longitude
       ORDER BY sp.store_name, sp.branch`
    );
    res.json({ success: true, shops: result.rows });
  } catch (err) {
    next(err);
  }
};

export const setUserActive = async (req, res, next) => {
  const client = await pool.connect();
  try {
    if (!isPositiveId(req.params.id) || typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'A valid user and active status are required.' });
    }

    const userId = Number(req.params.id);
    if (userId === Number(req.user.id) && !req.body.isActive) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own Admin account.' });
    }

    await client.query('BEGIN');
    const userResult = await client.query(
      'SELECT id, role, is_active FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const target = userResult.rows[0];
    if (target.role === 'Admin' && target.is_active && !req.body.isActive) {
      const activeAdmins = await client.query(
        `SELECT id FROM users WHERE role = 'Admin' AND is_active = TRUE FOR UPDATE`
      );
      if (activeAdmins.rows.length <= 1) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'At least one active Admin account must remain.' });
      }
    }

    const updated = await client.query(
      `UPDATE users SET is_active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, full_name, role, is_active`,
      [req.body.isActive, userId]
    );
    await client.query('COMMIT');
    res.json({ success: true, user: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const getProducts = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id,
        p.name,
        p.category,
        p.unit,
        p.description,
        p.is_active,
        COUNT(DISTINCT ss.id)::int AS shop_count
       FROM products p
       LEFT JOIN shop_stock ss ON ss.product_id = p.id
       GROUP BY p.id
       ORDER BY p.category, p.name`
    );
    res.json({ success: true, products: result.rows });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    if (!isPositiveId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'A valid product ID is required.' });
    }

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const category = typeof req.body.category === 'string' ? req.body.category.trim() : '';
    const unit = typeof req.body.unit === 'string' ? req.body.unit.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const productId = Number(req.params.id);

    if (!name || !category || !unit || name.length > 255 || category.length > 100 || unit.length > 50) {
      return res.status(400).json({ success: false, message: 'Enter a product name, category, and unit within the allowed lengths.' });
    }

    const duplicate = await pool.query(
      'SELECT id FROM products WHERE LOWER(name) = LOWER($1) AND id <> $2',
      [name, productId]
    );
    if (duplicate.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'A product with this name already exists.' });
    }

    const result = await pool.query(
      `UPDATE products
       SET name = $1, category = $2, unit = $3, description = $4
       WHERE id = $5
       RETURNING id, name, category, unit, description, is_active`,
      [name, category, unit, description, productId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const setProductActive = async (req, res, next) => {
  try {
    if (!isPositiveId(req.params.id) || typeof req.body.isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'A valid product and active status are required.' });
    }
    const result = await pool.query(
      `UPDATE products SET is_active = $1 WHERE id = $2
       RETURNING id, name, is_active`,
      [req.body.isActive, Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getShopListings = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
        ss.id,
        ss.shopkeeper_id,
        sp.store_name,
        sp.branch,
        p.id AS product_id,
        p.name AS product_name,
        p.is_active AS product_is_active,
        p.unit,
        ss.available_stock,
        ss.unit_price,
        TO_CHAR(ss.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ss.updated_at
       FROM shop_stock ss
       JOIN shopkeeper_profiles sp ON sp.user_id = ss.shopkeeper_id
       JOIN products p ON p.id = ss.product_id
       ORDER BY sp.store_name, p.name`
    );
    res.json({ success: true, listings: result.rows });
  } catch (err) {
    next(err);
  }
};

export const updateShopListing = async (req, res, next) => {
  try {
    if (!isPositiveId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'A valid shop listing is required.' });
    }

    const listing = parseRetailValues(req.body);
    if (listing.error) {
      return res.status(400).json({ success: false, message: listing.error });
    }

    const result = await pool.query(
      `UPDATE shop_stock
       SET available_stock = $1, unit_price = $2, expiry_date = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, shopkeeper_id, product_id, available_stock, unit_price, TO_CHAR(expiry_date, 'YYYY-MM-DD') AS expiry_date`,
      [listing.availableStock, listing.unitPrice, listing.expiryDate, Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shop listing not found.' });
    }
    res.json({ success: true, listing: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const deleteShopListing = async (req, res, next) => {
  try {
    if (!isPositiveId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'A valid shop listing is required.' });
    }
    const result = await pool.query(
      'DELETE FROM shop_stock WHERE id = $1 RETURNING id',
      [Number(req.params.id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Shop listing not found.' });
    }
    res.json({ success: true, message: 'Shop listing removed.' });
  } catch (err) {
    next(err);
  }
};

export const getRequests = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT pr.id, pr.request_code, pr.status, pr.quantity, pr.unit, pr.created_at,
              p.name AS product_name, u.full_name AS customer_name, u.email AS customer_email
       FROM purchase_requests pr
       JOIN products p ON p.id = pr.product_id
       JOIN users u ON u.id = pr.customer_id
       ORDER BY pr.created_at DESC
       LIMIT 500`
    );
    res.json({ success: true, requests: result.rows });
  } catch (err) {
    next(err);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT po.id, po.po_number, po.status, po.quantity, po.unit_price, po.total_amount, po.order_date,
              p.name AS product_name, sp.store_name, vendor.full_name AS vendor_name,
              customer.full_name AS customer_name
       FROM purchase_orders po
       JOIN products p ON p.id = po.product_id
       JOIN shopkeeper_profiles sp ON sp.user_id = po.shopkeeper_id
       JOIN users vendor ON vendor.id = po.vendor_id
       JOIN purchase_requests pr ON pr.id = po.request_id
       JOIN users customer ON customer.id = pr.customer_id
       ORDER BY po.order_date DESC
       LIMIT 500`
    );
    res.json({ success: true, orders: result.rows });
  } catch (err) {
    next(err);
  }
};
