import pool from '../config/db.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const listRes = await pool.query(
      `SELECT * FROM notifications 
       WHERE recipient_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    const countRes = await pool.query(
      `SELECT COUNT(*) AS unread_count 
       FROM notifications 
       WHERE recipient_id = $1 AND is_read = FALSE`,
      [userId]
    );

    res.json({
      success: true,
      unreadCount: Number(countRes.rows[0].unread_count),
      notifications: listRes.rows
    });
  } catch (err) {
    next(err);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND recipient_id = $2`,
      [id, userId]
    );

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    next(err);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE recipient_id = $1`,
      [userId]
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};
