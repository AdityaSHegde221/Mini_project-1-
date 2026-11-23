import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';
import FeaturesPage from './pages/public/FeaturesPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import RoleLoginPage from './pages/public/RoleLoginPage';
import RegisterCustomerPage from './pages/public/RegisterCustomerPage';
import RegisterVendorPage from './pages/public/RegisterVendorPage';
import RegisterStaffPage from './pages/public/RegisterStaffPage';

// Customer Pages
import CustomerHome from './pages/customer/CustomerHome';
import ProductOffers from './pages/customer/ProductOffers';
import CreateRequest from './pages/customer/CreateRequest';
import MyRequests from './pages/customer/MyRequests';
import RequestDetail from './pages/customer/RequestDetail';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerOrders from './pages/customer/CustomerOrders';
import CustomerPayments from './pages/customer/CustomerPayments';
import RetailOrderTrack from './pages/customer/RetailOrderTrack';

// Shopkeeper Pages
import ShopkeeperHome from './pages/shopkeeper/ShopkeeperHome';
import IncomingRequests from './pages/shopkeeper/IncomingRequests';
import VendorSearch from './pages/shopkeeper/VendorSearch';
import ShopkeeperEnquiries from './pages/shopkeeper/VendorEnquiries';
import PurchaseOrders from './pages/shopkeeper/PurchaseOrders';
import PurchaseOrderDetails from './pages/shopkeeper/PurchaseOrderDetails';
import ShopkeeperReports from './pages/shopkeeper/ShopkeeperReports';
import ShopkeeperProfile from './pages/shopkeeper/ShopkeeperProfile';
import RetailInventory from './pages/shopkeeper/RetailInventory';
import ShopkeeperRetailOrders from './pages/shopkeeper/RetailOrders';

// Vendor Pages
import VendorHome from './pages/vendor/VendorHome';
import ProductStock from './pages/vendor/ProductStock';
import VendorEnquiries from './pages/vendor/VendorEnquiries';
import VendorOrders from './pages/vendor/VendorOrders';
import VendorInvoices from './pages/vendor/VendorInvoices';
import VendorProfile from './pages/vendor/VendorProfile';

// Warehouse Pages
import WarehouseHome from './pages/warehouse/WarehouseHome';
import IncomingOrders from './pages/warehouse/IncomingOrders';
import GoodsReceipt from './pages/warehouse/GoodsReceipt';
import ReceivedInventory from './pages/warehouse/ReceivedInventory';
import WarehouseProfile from './pages/warehouse/WarehouseProfile';

// Finance Pages
import FinanceHome from './pages/finance/FinanceHome';
import FinanceOrders from './pages/finance/FinanceOrders';
import FinanceReceipts from './pages/finance/FinanceReceipts';
import FinanceInvoices from './pages/finance/FinanceInvoices';
import ThreeWayReconciliation from './pages/finance/ThreeWayReconciliation';
import PaymentRecords from './pages/finance/PaymentRecords';
import FinanceReports from './pages/finance/FinanceReports';
import FinanceProfile from './pages/finance/FinanceProfile';

// Admin Pages
import AdminHome from './pages/admin/AdminHome';

export function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />

      {/* Role-Specific Login Routes */}
      <Route path="/login/:roleName" element={<RoleLoginPage />} />
      <Route path="/register/customer" element={<RegisterCustomerPage />} />
      <Route path="/register/vendor" element={<RegisterVendorPage />} />
      <Route path="/register/shopkeeper" element={<RegisterStaffPage role="Shopkeeper" />} />
      <Route path="/register/finance" element={<RegisterStaffPage role="Finance" />} />

      {/* Customer Portal Protected Routes */}
      <Route
        path="/customer"
        element={
          <ProtectedRoute allowedRoles={['Customer']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<CustomerHome />} />
        <Route path="products/:productId" element={<ProductOffers />} />
        <Route path="create-request" element={<CreateRequest />} />
        <Route path="requests" element={<MyRequests />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="retail-orders/:id" element={<RetailOrderTrack />} />
        <Route path="orders" element={<CustomerOrders />} />
        <Route path="payments" element={<CustomerPayments />} />
        <Route path="profile" element={<CustomerProfile />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* Shopkeeper Portal Protected Routes */}
      <Route
        path="/shopkeeper"
        element={
          <ProtectedRoute allowedRoles={['Shopkeeper']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<ShopkeeperHome />} />
        <Route path="requests" element={<IncomingRequests />} />
        <Route path="vendors" element={<VendorSearch />} />
        <Route path="enquiries" element={<ShopkeeperEnquiries />} />
        <Route path="orders" element={<PurchaseOrders />} />
        <Route path="orders/:id" element={<PurchaseOrderDetails />} />
        <Route path="retail-orders" element={<ShopkeeperRetailOrders />} />
        <Route path="reports" element={<ShopkeeperReports />} />
        <Route path="inventory" element={<RetailInventory />} />
        <Route path="profile" element={<ShopkeeperProfile />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* Vendor Portal Protected Routes */}
      <Route
        path="/vendor"
        element={
          <ProtectedRoute allowedRoles={['Vendor']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<VendorHome />} />
        <Route path="products" element={<ProductStock />} />
        <Route path="enquiries" element={<VendorEnquiries />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="invoices" element={<VendorInvoices />} />
        <Route path="profile" element={<VendorProfile />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* Warehouse Portal Protected Routes */}
      <Route
        path="/warehouse"
        element={
          <ProtectedRoute allowedRoles={['Warehouse']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<WarehouseHome />} />
        <Route path="incoming-orders" element={<IncomingOrders />} />
        <Route path="receipts" element={<GoodsReceipt />} />
        <Route path="inventory" element={<ReceivedInventory />} />
        <Route path="profile" element={<WarehouseProfile />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* Finance Portal Protected Routes */}
      <Route
        path="/finance"
        element={
          <ProtectedRoute allowedRoles={['Finance']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<FinanceHome />} />
        <Route path="purchase-orders" element={<FinanceOrders />} />
        <Route path="receipts" element={<FinanceReceipts />} />
        <Route path="invoices" element={<FinanceInvoices />} />
        <Route path="reconciliation" element={<ThreeWayReconciliation />} />
        <Route path="payments" element={<PaymentRecords />} />
        <Route path="reports" element={<FinanceReports />} />
        <Route path="profile" element={<FinanceProfile />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* Admin Portal Protected Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="home" element={<AdminHome />} />
        <Route index element={<Navigate to="home" replace />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
