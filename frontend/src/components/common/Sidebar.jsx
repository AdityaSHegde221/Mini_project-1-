import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, PlusCircle, FileText, User, Inbox, Search, MessageSquare,
  ShoppingBag, BarChart3, Package, HelpCircle, FileCheck, Receipt, Truck,
  ClipboardCheck, Boxes, Scale, CreditCard, PieChart, FileSpreadsheet,
  PackageCheck, LogOut, Building2, ChevronRight, ShieldCheck, Layers, Wallet
} from 'lucide-react';

export const Sidebar = ({ isMobileOpen, closeMobile }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getNavLinks = () => {
    switch (role) {
      case 'Customer':
        return [
          { name: 'Browse Groceries', path: '/customer/home', icon: LayoutDashboard },
          { name: 'Interested to Purchase', path: '/customer/create-request', icon: PlusCircle },
          { name: 'My Orders & Requests', path: '/customer/requests', icon: FileText },
          { name: 'Purchase Journey', path: '/customer/orders', icon: ShoppingBag },
          { name: 'Payment & Invoices', path: '/customer/payments', icon: Wallet },
          { name: 'My Profile', path: '/customer/profile', icon: User },
        ];
      case 'Shopkeeper':
        return [
          { name: 'Dashboard', path: '/shopkeeper/home', icon: LayoutDashboard },
          { name: 'Incoming Requests', path: '/shopkeeper/requests', icon: Inbox },
          { name: 'Store Products & Prices', path: '/shopkeeper/inventory', icon: Package },
          { name: 'Customer Grocery Orders', path: '/shopkeeper/retail-orders', icon: ShoppingBag },
          { name: 'Vendor Search & Comparison', path: '/shopkeeper/vendors', icon: Search },
          { name: 'Vendor Enquiries', path: '/shopkeeper/enquiries', icon: MessageSquare },
          { name: 'Purchase Orders', path: '/shopkeeper/orders', icon: ShoppingBag },
          { name: 'Reports & Analytics', path: '/shopkeeper/reports', icon: BarChart3 },
          { name: 'Store Profile', path: '/shopkeeper/profile', icon: User },
        ];
      case 'Vendor':
        return [
          { name: 'Vendor Dashboard', path: '/vendor/home', icon: LayoutDashboard },
          { name: 'Product & Stock', path: '/vendor/products', icon: Package },
          { name: 'Incoming Enquiries', path: '/vendor/enquiries', icon: HelpCircle },
          { name: 'Purchase Orders', path: '/vendor/orders', icon: FileCheck },
          { name: 'Invoices', path: '/vendor/invoices', icon: Receipt },
          { name: 'Vendor Profile', path: '/vendor/profile', icon: User },
        ];
      case 'Warehouse':
        return [
          { name: 'Warehouse Home', path: '/warehouse/home', icon: LayoutDashboard },
          { name: 'Incoming Orders', path: '/warehouse/incoming-orders', icon: Truck },
          { name: 'Goods Receipts (GRN)', path: '/warehouse/receipts', icon: ClipboardCheck },
          { name: 'Received Inventory', path: '/warehouse/inventory', icon: Boxes },
          { name: 'Warehouse Profile', path: '/warehouse/profile', icon: User },
        ];
      case 'Finance':
        return [
          { name: 'Finance Overview', path: '/finance/home', icon: LayoutDashboard },
          { name: 'Purchase Orders', path: '/finance/purchase-orders', icon: FileSpreadsheet },
          { name: 'Goods Receipts', path: '/finance/receipts', icon: PackageCheck },
          { name: 'Vendor Invoices', path: '/finance/invoices', icon: Receipt },
          { name: '3-Way Reconciliation', path: '/finance/reconciliation', icon: Scale },
          { name: 'Payment Records', path: '/finance/payments', icon: CreditCard },
          { name: 'Financial Reports', path: '/finance/reports', icon: PieChart },
          { name: 'Finance Profile', path: '/finance/profile', icon: User },
        ];
      case 'Admin':
        return [
          { name: 'Admin Console', path: '/admin/home', icon: ShieldCheck },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      {isMobileOpen && (
        <div onClick={closeMobile} className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity" />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-navy-950 text-slate-200 z-50 flex flex-col border-r border-navy-900 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-6 border-b border-navy-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-navy-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">FRESHCART</span>
              <span className="text-[10px] font-semibold text-teal-400 tracking-wider uppercase block">Grocery Compare</span>
            </div>
          </div>
        </div>

        {/* Current Role */}
        <div className="px-6 py-4 bg-navy-900/50 border-b border-navy-900/80">
          <p className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase">Active Workspace</p>
          <div className="flex items-center mt-1">
            <span className="text-sm font-bold text-white flex items-center">
              <span className="w-2 h-2 rounded-full bg-teal-400 mr-2"></span>
              {role} Portal
            </span>
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-300 border border-teal-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-navy-900/70'
                  }`
                }
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                  <span>{item.name}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-900 bg-navy-950/80">
          <div className="flex items-center space-x-3 p-2 rounded-xl bg-navy-900/40 border border-navy-900 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-600 to-navy-600 flex items-center justify-center text-white font-bold text-xs uppercase">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 border border-rose-500/20 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Secure Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;