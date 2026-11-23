import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import WorkflowEngine from '../modules/E1-Workflow/workflowEngine.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_procurement_system_jwt_key_2026_secure';

export const register = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { email, password, role, fullName, phone, profileData } = req.body;

    if (!email || !password || !role || !fullName) {
      return res.status(400).json({ success: false, message: 'Please provide email, password, role, and full name.' });
    }

    const validRoles = ['Customer', 'Shopkeeper', 'Vendor', 'Warehouse', 'Finance'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Check duplicate email
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'A user with this email address already exists.' });
    }

    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const userRes = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone)
       VALUES (LOWER($1), $2, $3, $4, $5) RETURNING id, email, role, full_name, phone, created_at`,
      [email.trim(), passwordHash, role, fullName.trim(), phone || null]
    );

    const user = userRes.rows[0];

    // Create role-specific profile
    if (role === 'Customer') {
      await client.query(
        `INSERT INTO customer_profiles (user_id, organization, address, department)
         VALUES ($1, $2, $3, $4)`,
        [user.id, profileData?.organization || 'Standard Organization', profileData?.address || '', profileData?.department || 'General Operations']
      );
    } else if (role === 'Vendor') {
      await client.query(
        `INSERT INTO vendor_profiles (user_id, company_name, rating, tax_id, address, contact_person)
         VALUES ($1, $2, 4.50, $3, $4, $5)`,
        [user.id, profileData?.companyName || fullName, profileData?.taxId || 'GSTIN-PENDING', profileData?.address || '', fullName]
      );
    } else if (role === 'Shopkeeper') {
      await client.query(
        `INSERT INTO shopkeeper_profiles (user_id, store_name, branch, address)
         VALUES ($1, $2, $3, $4)`,
        [user.id, profileData?.storeName || 'Campus Depot', profileData?.branch || 'Main Branch', profileData?.address || '']
      );
    } else if (role === 'Warehouse') {
      await client.query(
        `INSERT INTO warehouse_profiles (user_id, warehouse_name, location_code, address)
         VALUES ($1, $2, $3, $4)`,
        [user.id, profileData?.warehouseName || 'Central WH', 'WH-01', profileData?.address || '']
      );
    } else if (role === 'Finance') {
      await client.query(
        `INSERT INTO finance_profiles (user_id, employee_code, approval_limit)
         VALUES ($1, $2, 10000000.00)`,
        [user.id, profileData?.employeeCode || 'FIN-REG']
      );
    }

    await WorkflowEngine.logAudit({
      actorId: user.id,
      actorRole: role,
      action: 'REGISTER_USER',
      entityType: 'users',
      entityId: user.id,
      details: { email: user.email, role },
      client
    });

    await client.query('COMMIT');

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password, portalRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const userRes = await pool.query(
      `SELECT id, email, password_hash, role, full_name, phone, is_active FROM users 
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = userRes.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated.' });
    }

    // Strictly enforce role-specific portal entry point
    if (portalRole && user.role.toLowerCase() !== portalRole.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You attempted to log in via the ${portalRole} portal, but your registered role is '${user.role}'. Please use your designated portal.`
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Fetch role profile
    let profile = null;
    if (user.role === 'Customer') {
      const p = await pool.query('SELECT * FROM customer_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Shopkeeper') {
      const p = await pool.query('SELECT * FROM shopkeeper_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Vendor') {
      const p = await pool.query('SELECT * FROM vendor_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Warehouse') {
      const p = await pool.query('SELECT * FROM warehouse_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Finance') {
      const p = await pool.query('SELECT * FROM finance_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    }

    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    delete user.password_hash;

    await WorkflowEngine.logAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'LOGIN',
      entityType: 'users',
      entityId: user.id,
      details: { email: user.email, role: user.role, portalRole }
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user,
      profile
    });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = req.user;
    let profile = null;

    if (user.role === 'Customer') {
      const p = await pool.query('SELECT * FROM customer_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Shopkeeper') {
      const p = await pool.query('SELECT * FROM shopkeeper_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Vendor') {
      const p = await pool.query('SELECT * FROM vendor_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Warehouse') {
      const p = await pool.query('SELECT * FROM warehouse_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    } else if (user.role === 'Finance') {
      const p = await pool.query('SELECT * FROM finance_profiles WHERE user_id = $1', [user.id]);
      profile = p.rows[0];
    }

    res.json({
      success: true,
      user,
      profile
    });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await WorkflowEngine.logAudit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'LOGOUT',
        entityType: 'users',
        entityId: req.user.id
      });
    }
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};
