import express from 'express';
import {
  getIncomingOrders,
  recordGoodsReceipt,
  getAllReceipts,
  getReceiptDetails,
  getInventory
} from '../controllers/warehouseController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('Warehouse'));

router.get('/incoming-orders', getIncomingOrders);
router.post('/receipts', recordGoodsReceipt);
router.get('/receipts', getAllReceipts);
router.get('/receipts/:id', getReceiptDetails);
router.get('/inventory', getInventory);

export default router;
