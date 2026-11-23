import express from 'express';
import { createRequest, getMyRequests, getRequestDetails, getProducts, getProductOffers } from '../controllers/customerController.js';
import {
  confirmRetailReceipt,
  createRetailInterest,
  getCustomerEBill,
  getCustomerPayments,
  getCustomerRetailOrder,
  getCustomerRetailOrders,
  recordRetailPayment
} from '../controllers/retailOrderController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('Customer'));

router.post('/requests', createRequest);
router.get('/requests', getMyRequests);
router.get('/requests/:id', getRequestDetails);
router.get('/products', getProducts);
router.get('/products/:productId/offers', getProductOffers);
router.post('/retail-orders', createRetailInterest);
router.get('/retail-orders', getCustomerRetailOrders);
router.get('/retail-orders/:id', getCustomerRetailOrder);
router.post('/retail-orders/:id/receipt', confirmRetailReceipt);
router.post('/retail-orders/:id/payments', recordRetailPayment);
router.get('/payments', getCustomerPayments);
router.get('/payments/:paymentId/bill', getCustomerEBill);

export default router;
