import express from 'express';
import {
  getPurchaseOrders,
  getGoodsReceipts,
  getInvoices,
  getReconciliationPreview,
  executeReconciliation,
  getReconciliations,
  recordPayment,
  getPayments,
  getFinancialReports
} from '../controllers/financeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('Finance'));

router.get('/purchase-orders', getPurchaseOrders);
router.get('/receipts', getGoodsReceipts);
router.get('/invoices', getInvoices);

router.get('/reconciliation/preview/:poId', getReconciliationPreview);
router.post('/reconciliation', executeReconciliation);
router.get('/reconciliations', getReconciliations);

router.post('/payments', recordPayment);
router.get('/payments', getPayments);
router.get('/reports', getFinancialReports);

export default router;
