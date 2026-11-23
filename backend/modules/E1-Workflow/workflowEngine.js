import pool from '../../config/db.js';

export const WORKFLOW_STATES = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  VENDOR_SELECTED: 'Vendor Selected',
  ORDERED: 'Ordered',
  RECEIVED: 'Received',
  COMPLETED: 'Completed'
};

const VALID_TRANSITIONS = {
  [WORKFLOW_STATES.PENDING]: [WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REJECTED],
  [WORKFLOW_STATES.APPROVED]: [WORKFLOW_STATES.VENDOR_SELECTED],
  [WORKFLOW_STATES.VENDOR_SELECTED]: [WORKFLOW_STATES.ORDERED],
  [WORKFLOW_STATES.ORDERED]: [WORKFLOW_STATES.RECEIVED],
  [WORKFLOW_STATES.RECEIVED]: [WORKFLOW_STATES.COMPLETED],
  [WORKFLOW_STATES.REJECTED]: [],
  [WORKFLOW_STATES.COMPLETED]: []
};

export class WorkflowEngine {
  /**
   * Validate if state transition is legally allowed in the procurement lifecycle
   */
  static validateTransition(currentStatus, targetStatus) {
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
      const error = new Error(`Invalid lifecycle transition from '${currentStatus}' to '${targetStatus}'.`);
      error.statusCode = 400;
      throw error;
    }
    return true;
  }

  /**
   * Dispatch a notification directly to PostgreSQL
   */
  static async sendNotification({ recipientId, eventType, title, message, relatedEntityType, relatedEntityId, client = pool }) {
    try {
      const res = await client.query(
        `INSERT INTO notifications (recipient_id, event_type, title, message, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [recipientId, eventType, title, message, relatedEntityType || null, relatedEntityId || null]
      );
      return res.rows[0];
    } catch (err) {
      console.error('Failed to dispatch notification:', err);
    }
  }

  /**
   * Log an immutable audit record in PostgreSQL
   */
  static async logAudit({ actorId, actorRole, action, entityType, entityId, details = {}, ip = '127.0.0.1', client = pool }) {
    try {
      await client.query(
        `INSERT INTO audit_logs (actor_id, actor_role, action, entity_type, entity_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [actorId || null, actorRole, action, entityType, entityId, JSON.stringify(details), ip]
      );
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
}

export default WorkflowEngine;
