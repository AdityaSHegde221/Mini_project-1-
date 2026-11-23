import express from 'express';
import {
  getAllRequests,
  getRequestDetails,
  approveRequest,
  rejectRequest,
  searchVendors,
  searchVendorBasket,
  createVendorBasketEnquiry,
  getShopkeeperBasketEnquiries,
  sendEnquiry,
  getEnquiries,
  confirmOrder,
  confirmBasketOrder,
  getAllOrders,
  getOrderDetails,
  markShopkeeperOrderReceived,
  getRetailInventory,
  createRetailProduct,
  upsertRetailListing,
  deleteRetailListing,
  updateStoreLocation
} from '../controllers/shopkeeperController.js';
import {
  getShopkeeperRetailOrders,
  issueRetailInvoice,
  updateRetailInterestStatus
} from '../controllers/retailOrderController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('Shopkeeper'));

router.get('/requests', getAllRequests);
router.get('/requests/:id', getRequestDetails);
router.patch('/requests/:id/approve', approveRequest);
router.patch('/requests/:id/reject', rejectRequest);

router.get('/vendors/search', searchVendors);
router.post('/vendors/search-basket', searchVendorBasket);
router.post('/basket-enquiries', createVendorBasketEnquiry);
router.get('/basket-enquiries', getShopkeeperBasketEnquiries);
router.get('/inventory', getRetailInventory);
router.post('/products', createRetailProduct);
router.put('/inventory/:productId', upsertRetailListing);
router.delete('/inventory/:productId', deleteRetailListing);
router.get('/retail-orders', getShopkeeperRetailOrders);
router.patch('/retail-orders/:id/status', updateRetailInterestStatus);
router.post('/retail-orders/:id/invoice', issueRetailInvoice);
router.put('/store-location', updateStoreLocation);
router.post('/enquiries', sendEnquiry);
router.get('/enquiries', getEnquiries);

router.post('/orders', confirmOrder);
router.post('/orders/basket', confirmBasketOrder);
router.get('/orders', getAllOrders);
router.get('/orders/:id', getOrderDetails);
router.patch('/orders/:id/received', markShopkeeperOrderReceived);

export default router;
