import pool from '../config/db.js';

export const getSystemOverview = async (req, res, next) => {
  try {
    const totalRequests = await pool.query('SELECT COUNT(*) FROM purchase_requests');
    const pendingRequests = await pool.query("SELECT COUNT(*) FROM purchase_requests WHERE status = 'Pending'");
    const approvedRequests = await pool.query("SELECT COUNT(*) FROM purchase_requests WHERE status = 'Approved'");
    const completedRequests = await pool.query("SELECT COUNT(*) FROM purchase_requests WHERE status = 'Completed'");
    const totalPOs = await pool.query('SELECT COUNT(*), COALESCE(SUM(total_amount), 0) AS total_val FROM purchase_orders');
    const totalGRNs = await pool.query('SELECT COUNT(*) FROM goods_receipts');
    const totalPayments = await pool.query("SELECT COUNT(*), COALESCE(SUM(amount), 0) AS paid_val FROM payments WHERE status = 'Completed'");
    const totalVendors = await pool.query("SELECT COUNT(*) FROM users WHERE role = 'Vendor' AND is_active = TRUE");

    // Request status breakdown for charts
    const statusBreakdown = await pool.query(
      `SELECT status, COUNT(*) AS count 
       FROM purchase_requests 
       GROUP BY status`
    );

    // Recent orders with details
    const recentOrders = await pool.query(
      `SELECT po.id, po.po_number, po.total_amount, po.status, p.name AS product_name, v.full_name AS vendor_name, po.created_at
       FROM purchase_orders po
       JOIN products p ON po.product_id = p.id
       JOIN users v ON po.vendor_id = v.id
       ORDER BY po.created_at DESC LIMIT 6`
    );

    res.json({
      success: true,
      summary: {
        totalRequests: Number(totalRequests.rows[0].count),
        pendingRequests: Number(pendingRequests.rows[0].count),
        approvedRequests: Number(approvedRequests.rows[0].count),
        completedRequests: Number(completedRequests.rows[0].count),
        totalOrdersCount: Number(totalPOs.rows[0].count),
        totalOrdersValue: Number(totalPOs.rows[0].total_val),
        totalGRNs: Number(totalGRNs.rows[0].count),
        totalPaymentsCount: Number(totalPayments.rows[0].count),
        totalPaidValue: Number(totalPayments.rows[0].paid_val),
        activeVendorsCount: Number(totalVendors.rows[0].count)
      },
      statusDistribution: statusBreakdown.rows,
      recentOrders: recentOrders.rows
    });
  } catch (err) {
    next(err);
  }
};

export const getAuditLogs = async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT 
        al.*,
        u.email AS actor_email,
        u.full_name AS actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ORDER BY al.created_at DESC 
       LIMIT $1`,
      [Number(limit)]
    );

    res.json({ success: true, auditLogs: result.rows });
  } catch (err) {
    next(err);
  }
};
