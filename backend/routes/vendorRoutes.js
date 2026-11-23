import express from 'express';
import {
  getProfile,
  updateProfile,
  getProductsAndStock,
  updateStock,
  getIncomingEnquiries,
  getIncomingBasketEnquiries,
  respondToBasketEnquiry,
  respondToEnquiry,
  getVendorOrders,
  dispatchVendorOrder,
  createInvoice,
  getInvoices
} from '../controllers/vendorController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('Vendor'));

router.get('/profile', getProfile);
router.put('/profile', updateProfile);

router.get('/products', getProductsAndStock);
router.post('/stock', updateStock);

router.get('/enquiries', getIncomingEnquiries);
router.patch('/enquiries/:id/respond', respondToEnquiry);
router.get('/basket-enquiries', getIncomingBasketEnquiries);
router.patch('/basket-enquiries/:id/respond', respondToBasketEnquiry);

router.get('/orders', getVendorOrders);
router.patch('/orders/:id/dispatch', dispatchVendorOrder);

router.post('/invoices', createInvoice);
router.get('/invoices', getInvoices);

export default router;
