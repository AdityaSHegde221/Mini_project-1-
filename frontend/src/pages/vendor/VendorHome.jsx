import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import { Building, Package, HelpCircle, FileCheck, Receipt, ArrowRight, Clock, TrendingUp, Truck } from 'lucide-react';

export const VendorHome = () => {
  const { user, profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [enquiries, setEnquiries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendorData = async () => {
      try {
        const [prodRes, enqRes, ordRes, invRes] = await Promise.all([
          api.get('/vendor/products'),
          api.get('/vendor/enquiries'),
          api.get('/vendor/orders'),
          api.get('/vendor/invoices')
        ]);
        setProducts(prodRes.data.products);
        setEnquiries(enqRes.data.enquiries);
        setOrders(ordRes.data.orders);
        setInvoices(invRes.data.invoices);
      } catch (err) {
        console.error('Failed to load vendor data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendorData();
  }, []);

  const totalBilled = invoices.reduce((acc, i) => acc + Number(i.total_amount || 0), 0);
  const pendingEnquiries = enquiries.filter(e => e.status === 'Sent').length;
  const companyName = profile?.company_name || user?.full_name || 'Your Depot';
  const firstName = user?.full_name?.split(' ')[0] || 'Vendor';

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-br from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-300 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="px-2.5 py-1 bg-teal-400/20 border border-teal-400/30 text-teal-200 text-[10px] font-bold tracking-widest uppercase rounded-full">
              Supplier Workspace
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
              {companyName}
            </h1>
            <p className="text-xs text-teal-200 mt-0.5">Logged in as {user?.full_name}</p>
            <p className="text-sm text-slate-300 mt-2 max-w-lg">
              Manage your wholesale grocery inventory, respond to quotation enquiries, fulfill purchase orders, and submit digital invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <Link to="/vendor/products" className="px-4 py-2.5 rounded-2xl bg-teal-400 hover:bg-teal-300 text-teal-900 font-bold text-xs shadow-md transition flex items-center space-x-2">
              <Package className="w-4 h-4" />
              <span>Manage Stock</span>
            </Link>
            <Link to="/vendor/enquiries" className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-teal-300" />
              <span>Enquiries {pendingEnquiries > 0 && `(${pendingEnquiries})`}</span>
            </Link>
          </div>
        </div>

        {pendingEnquiries > 0 && (
          <div className="relative mt-5 p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center space-x-3">
            <HelpCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200">
              <strong>{pendingEnquiries} quotation enquir{pendingEnquiries > 1 ? 'ies' : 'y'}</strong> from shopkeeper waiting for your response
            </p>
            <Link to="/vendor/enquiries" className="ml-auto text-xs text-amber-300 font-bold hover:underline flex-shrink-0">
              Respond Now →
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Stocked</span>
            <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
              <Package className="w-4 h-4 text-teal-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{products.filter(p => Number(p.available_stock) > 0).length}</p>
          <p className="text-xs text-slate-400 mt-0.5">of {products.length} catalog items</p>
        </div>
        <div className={`rounded-2xl p-5 border shadow-sm ${pendingEnquiries > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Enquiries</span>
            <div className={`w-8 h-8 ${pendingEnquiries > 0 ? 'bg-amber-100' : 'bg-slate-50'} rounded-xl flex items-center justify-center`}>
              <HelpCircle className={`w-4 h-4 ${pendingEnquiries > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
          </div>
          <p className={`text-3xl font-black ${pendingEnquiries > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{pendingEnquiries}</p>
          <p className="text-xs text-slate-400 mt-0.5">Awaiting quotation</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">POs Active</span>
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <FileCheck className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{orders.length}</p>
          <p className="text-xs text-slate-400 mt-0.5">Purchase orders</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoiced</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Receipt className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {'\u20B9'}{totalBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{invoices.length} invoices</p>
        </div>
      </div>

      {/* Assigned POs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Assigned Purchase Orders</h2>
            <p className="text-xs text-slate-400 mt-0.5">Orders confirmed by shopkeeper with reserved stock</p>
          </div>
          <Link to="/vendor/orders" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center">
            View all ({orders.length}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">No purchase orders assigned yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">PO Number</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Value</th>
                  <th className="px-5 py-3.5">Invoice</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 5).map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-teal-700">{po.po_number}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{po.product_name}</td>
                    <td className="px-5 py-3.5 text-slate-700">{po.quantity} {po.product_unit}</td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800">
                      {'\u20B9'}{Number(po.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5">
                      {po.invoice_number ? (
                        <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          {po.invoice_number}
                        </span>
                      ) : (
                        <span className="text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          Pending Invoice
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to="/vendor/orders" className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-teal-700 hover:text-white rounded-lg font-semibold transition">
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VendorHome;