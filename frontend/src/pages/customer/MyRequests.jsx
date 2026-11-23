import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { Search, SlidersHorizontal, Heart, RefreshCw, Store } from 'lucide-react';

export const MyRequests = () => {
  const [requests, setRequests] = useState([]);
  const [retailOrders, setRetailOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retailOrdersLoading, setRetailOrdersLoading] = useState(true);
  const [retailOrdersError, setRetailOrdersError] = useState('');
  const [requestsError, setRequestsError] = useState('');
  const [refreshingRetailOrders, setRefreshingRetailOrders] = useState(false);
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [qtyMin, setQtyMin] = useState('');
  const [qtyMax, setQtyMax] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');

  const fetchRetailOrders = async () => {
    setRetailOrdersError('');
    try {
      const response = await api.get('/customer/retail-orders');
      setRetailOrders(response.data.orders || []);
    } catch (error) {
      setRetailOrdersError(error.response?.data?.message || 'Could not load your grocery orders and quantity requests.');
    } finally {
      setRetailOrdersLoading(false);
    }
  };

  const fetchProcurementRequests = async () => {
    setRequestsError('');
    try {
      const response = await api.get('/customer/requests');
      setRequests(response.data.requests || []);
    } catch (error) {
      setRequestsError(error.response?.data?.message || 'Could not load procurement requests.');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrdersAndRequests = async () => {
    setRefreshingRetailOrders(true);
    await Promise.all([fetchRetailOrders(), fetchProcurementRequests()]);
    setRefreshingRetailOrders(false);
  };

  useEffect(() => {
    fetchProcurementRequests();
    fetchRetailOrders();
  }, []);

  const combinedRequests = [
    ...retailOrders.map((order) => ({
      id: `retail-${order.id}`,
      recordId: order.id,
      kind: 'grocery',
      code: order.order_number,
      product_name: order.product_name,
      product_category: order.product_category,
      quantity: order.quantity,
      unit: order.unit,
      created_at: order.created_at,
      shop_name: order.store_name,
      status: order.status,
      trackTo: `/customer/retail-orders/${order.id}`,
      po_number: null,
    })),
    ...requests.map((request) => ({
      id: `procurement-${request.id}`,
      recordId: request.id,
      kind: 'procurement',
      code: request.request_code,
      product_name: request.product_name,
      product_category: request.product_category,
      quantity: request.quantity,
      unit: request.unit,
      created_at: request.created_at,
      shop_name: request.vendor_name || 'Not assigned',
      status: request.status,
      trackTo: `/customer/requests/${request.id}`,
      po_number: request.po_number,
    })),
  ];

  const filtered = combinedRequests
    .filter((r) => {
      const matchesStatus = filterStatus === 'All' || r.status.toLowerCase() === filterStatus.toLowerCase();
      const matchesSearch =
        r.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.product_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const qty = Number(r.quantity);
      const matchesQtyMin = qtyMin === '' || qty >= Number(qtyMin);
      const matchesQtyMax = qtyMax === '' || qty <= Number(qtyMax);
      return matchesStatus && matchesSearch && matchesQtyMin && matchesQtyMax;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'qty_asc': return Number(a.quantity) - Number(b.quantity);
        case 'qty_desc': return Number(b.quantity) - Number(a.quantity);
        case 'date_asc': return new Date(a.created_at) - new Date(b.created_at);
        case 'date_desc':
        default: return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Orders & Requests</h1>
          <p className="text-xs text-slate-500">All grocery orders, quantity requests, and procurement requests in one list.</p>
        </div>
        <Link
          to="/customer/create-request"
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5"
        >
          <Heart className="w-4 h-4" />
          <span>Interested to Purchase</span>
        </Link>
      </div>

      {retailOrdersError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{retailOrdersError}</p>}
      <button
        type="button"
        onClick={refreshOrdersAndRequests}
        disabled={refreshingRetailOrders}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${refreshingRetailOrders ? 'animate-spin' : ''}`} />
        Refresh all
      </button>
      {requestsError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{requestsError}</p>}

      <div>
        <h2 className="text-lg font-extrabold text-slate-900">All Orders & Requests</h2>
        <p className="mt-1 text-xs text-slate-500">Grocery orders, quantity requests, and procurement requests are combined below.</p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code or product..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Sort By */}
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-blue-500 focus:outline-none"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="qty_desc">Quantity: High to Low</option>
              <option value="qty_asc">Quantity: Low to High</option>
            </select>
          </div>
        </div>

        {/* Quantity Filter */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex-shrink-0">Quantity Filter:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="500"
              value={qtyMin}
              onChange={(e) => setQtyMin(e.target.value)}
              placeholder="Min (1)"
              className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-500 focus:outline-none"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="number"
              min="1"
              max="500"
              value={qtyMax}
              onChange={(e) => setQtyMax(e.target.value)}
              placeholder="Max (500)"
              className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:border-blue-500 focus:outline-none"
            />
            {(qtyMin || qtyMax) && (
              <button
                onClick={() => { setQtyMin(''); setQtyMax(''); }}
                className="text-xs text-rose-500 hover:underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 ml-auto">
            {['All', 'Interested', 'Accepted', 'Invoiced', 'Pending', 'Approved', 'Ordered', 'Completed', 'Rejected'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filterStatus === status
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-500">
        Showing <strong>{filtered.length}</strong> of {combinedRequests.length} order{combinedRequests.length !== 1 ? 's' : ''} and request{combinedRequests.length !== 1 ? 's' : ''}
        {qtyMin && ` (qty >= ${qtyMin})`}
        {qtyMax && ` (qty <= ${qtyMax})`}
      </p>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading || retailOrdersLoading ? (
            <div className="p-10 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 mt-3">Loading requests...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-medium">
              No requests match your filters.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Order / Request ID</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Quantity</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Shop / Vendor</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Track</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((req) => (
                  <tr id={req.kind === 'grocery' ? `retail-order-${req.recordId}` : `procurement-request-${req.recordId}`} key={req.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700">{req.code}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{req.product_name}</p>
                      <p className="text-[11px] text-slate-400">{req.product_category}</p>
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{req.quantity} {req.unit}</td>
                    <td className="px-5 py-3.5 text-slate-500">{new Date(req.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-3.5">
                      {req.kind === 'grocery' ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><Store className="h-3.5 w-3.5 text-slate-400" />{req.shop_name}</span>
                      ) : (
                        <span className="text-slate-600">{req.shop_name}{req.po_number ? ` - ${req.po_number}` : ''}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5"><Badge status={req.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Link to={req.trackTo} className="rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-700 transition hover:bg-blue-700 hover:text-white">Track</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyRequests;