import express from 'express';
import {
  deleteShopListing,
  createAdminUser,
  getOrders,
  getOverview,
  getProducts,
  getRequests,
  getShops,
  getShopListings,
  getUsers,
  setProductActive,
  setUserActive,
  updateProduct,
  updateShopListing
} from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requireRole('Admin'));

router.get('/overview', getOverview);
router.get('/users', getUsers);
router.post('/users', createAdminUser);
router.get('/shops', getShops);
router.patch('/users/:id/status', setUserActive);
router.get('/products', getProducts);
router.put('/products/:id', updateProduct);
router.patch('/products/:id/status', setProductActive);
router.get('/listings', getShopListings);
router.put('/listings/:id', updateShopListing);
router.delete('/listings/:id', deleteShopListing);
router.get('/requests', getRequests);
router.get('/orders', getOrders);

export default router;
