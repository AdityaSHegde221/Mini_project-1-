import express from 'express';
import { getSystemOverview, getAuditLogs } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/overview', getSystemOverview);
router.get('/audit-logs', getAuditLogs);

export default router;
