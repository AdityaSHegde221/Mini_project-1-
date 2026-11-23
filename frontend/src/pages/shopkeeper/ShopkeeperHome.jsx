import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import { Inbox, Search, ShoppingBag, CheckCircle, ArrowRight, Clock, AlertTriangle, TrendingUp, Users } from 'lucide-react';

export const ShopkeeperHome = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [reqRes, ordRes] = await Promise.all([
          api.get('/shopkeeper/requests'),
          api.get('/shopkeeper/orders')
        ]);
        setRequests(reqRes.data.requests);
        setOrders(ordRes.data.orders);
      } catch (err) {
        console.error('Failed to load shopkeeper dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const pending = requests.filter(r => r.status === 'Pending').length;
  const approved = requests.filter(r => r.status === 'Approved').length;
  const totalOrders = orders.length;
  const totalSpend = orders.reduce((acc, o) => acc + Number(o.total_amount || 0), 0);
  const firstName = user?.full_name?.split(' ')[0] || 'Manager';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-72 h-72 bg-teal-400 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400 rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <span className="px-2.5 py-1 bg-teal-500/20 border border-teal-500/30 text-teal-300 text-[10px] font-bold tracking-widest uppercase rounded-full">
              Shopkeeper Hub
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
              Welcome, {firstName}!
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-lg">
              Manage incoming grocery requests, run E2 vendor evaluation, and issue confirmed purchase orders to your suppliers.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 flex-shrink-0">
            <Link to="/shopkeeper/requests" className="px-4 py-2.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-md transition flex items-center space-x-2">
              <Inbox className="w-4 h-4" />
              <span>Review Requests {pending > 0 && `(${pending})`}</span>
            </Link>
            <Link to="/shopkeeper/vendors" className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-bold text-xs transition flex items-center space-x-2">
              <Search className="w-4 h-4 text-teal-300" />
              <span>E2 Vendor Search</span>
            </Link>
          </div>
        </div>

        {/* Alert for pending */}
        {pending > 0 && (
          <div className="relative mt-5 p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-center space-x-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <p className="text-xs text-amber-200">
              <strong>{pending} customer request{pending > 1 ? 's' : ''}</strong> awaiting your approval in the queue
            </p>
            <Link to="/shopkeeper/requests" className="ml-auto text-xs text-amber-300 font-bold hover:underline flex-shrink-0">
              Review Now →
            </Link>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-5 border shadow-sm ${pending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending</span>
            <div className={`w-8 h-8 ${pending > 0 ? 'bg-amber-100' : 'bg-slate-50'} rounded-xl flex items-center justify-center`}>
              <Clock className={`w-4 h-4 ${pending > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
            </div>
          </div>
          <p className={`text-3xl font-black ${pending > 0 ? 'text-amber-700' : 'text-slate-900'}`}>{pending}</p>
          <p className="text-xs text-slate-500 mt-0.5">Need your review</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approved</span>
            <div className="w-8 h-8 bg-teal-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-teal-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{approved}</p>
          <p className="text-xs text-slate-400 mt-0.5">Ready to order</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">POs Issued</span>
            <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalOrders}</p>
          <p className="text-xs text-slate-400 mt-0.5">Purchase orders</p>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Value</span>
            <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900">
            {'\u20B9'}{totalSpend.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Procurement volume</p>
        </div>
      </div>

      {/* Incoming Queue */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Incoming Requisition Queue</h2>
            <p className="text-xs text-slate-400 mt-0.5">Customer grocery requests awaiting triage</p>
          </div>
          <Link to="/shopkeeper/requests" className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center">
            Manage all ({requests.length}) <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3">Loading queue...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">No customer requests in queue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Request ID</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.slice(0, 7).map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{req.request_code}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{req.customer_name}</p>
                      <p className="text-[11px] text-slate-400">{req.organization || 'Customer'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-700">{req.product_name}</p>
                      <p className="text-[11px] text-slate-400">{req.product_category}</p>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-700">{req.quantity} {req.unit}</td>
                    <td className="px-5 py-3.5"><Badge status={req.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      {req.status === 'Pending' ? (
                        <Link to="/shopkeeper/requests" className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-semibold hover:bg-amber-100 transition">
                          Review Now
                        </Link>
                      ) : req.status === 'Approved' ? (
                        <Link
                          to={`/shopkeeper/vendors?productId=${req.product_id}&qty=${req.quantity}&reqId=${req.id}`}
                          className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-semibold hover:bg-teal-100 transition"
                        >
                          Select Vendor
                        </Link>
                      ) : (
                        <Link to="/shopkeeper/requests" className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-semibold hover:bg-slate-200 transition">
                          View
                        </Link>
                      )}
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

export default ShopkeeperHome;