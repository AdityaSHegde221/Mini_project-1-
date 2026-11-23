import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { AlertCircle, Check, Clock3, FileText, X } from 'lucide-react';

const RetailOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadOrders = useCallback(async () => {
    setError('');
    try {
      const response = await api.get('/shopkeeper/retail-orders');
      setOrders(response.data.orders || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load customer grocery orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const decideOrder = async (order, status) => {
    setBusyOrderId(order.id);
    setError('');
    setNotice('');
    try {
      await api.patch(`/shopkeeper/retail-orders/${order.id}/status`, { status });
      setNotice(`${order.order_number} ${status.toLowerCase()}.`);
      await loadOrders();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this order.');
    } finally {
      setBusyOrderId(null);
    }
  };

  const issueInvoice = async (order, event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusyOrderId(order.id);
    setError('');
    setNotice('');
    try {
      const response = await api.post(`/shopkeeper/retail-orders/${order.id}/invoice`, {
        quantity: Number(formData.get('quantity')),
        unitPrice: Number(formData.get('unitPrice')),
      });
      setNotice(`Invoice ${response.data.invoice.invoice_number} issued for ${order.order_number}.`);
      await loadOrders();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not issue invoice for this order.');
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Customer grocery orders</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Customer Grocery Orders</h1>
        <p className="mt-2 text-sm text-slate-500">Available-stock orders are placed immediately. Review requests that exceed listed stock, and issue invoices for accepted orders.</p>
      </header>

      {error && <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading purchase interests...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">No customer grocery orders or requests yet.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-teal-700">{order.order_number}</p>
                  <h2 className="mt-1 font-black text-slate-900">{order.product_name}</h2>
                  <p className="mt-1 text-xs text-slate-500">{order.customer_name} · {order.customer_email}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${order.status === 'Interested' ? 'bg-amber-50 text-amber-800' : order.status === 'Rejected' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>{order.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                <div><p className="text-slate-400">Quantity</p><p className="mt-1 font-bold text-slate-800">{order.quantity} {order.unit}</p></div>
                <div><p className="text-slate-400">Unit price</p><p className="mt-1 font-bold text-slate-800">₹{Number(order.unit_price).toFixed(2)} / {order.unit}</p></div>
                <div><p className="text-slate-400">Order total</p><p className="mt-1 font-bold text-slate-800">₹{Number(order.total_amount).toFixed(2)}</p></div>
                <div><p className="text-slate-400">Requested</p><p className="mt-1 flex items-center gap-1 font-bold text-slate-800"><Clock3 className="h-3.5 w-3.5" />{new Date(order.created_at).toLocaleDateString('en-IN')}</p></div>
              </div>
              {order.status === 'Interested' && (
                <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
                  <button type="button" disabled={busyOrderId === order.id} onClick={() => decideOrder(order, 'Rejected')} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                    <X className="h-4 w-4" /> Reject
                  </button>
                  <button type="button" disabled={busyOrderId === order.id} onClick={() => decideOrder(order, 'Accepted')} className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                    <Check className="h-4 w-4" /> Accept
                  </button>
                </div>
              )}
              {order.invoice_number && (
                <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  Latest invoice: <strong>{order.invoice_number}</strong> · {order.invoice_quantity} {order.unit} · ₹{Number(order.invoice_total).toFixed(2)}
                </p>
              )}
              {['Accepted', 'Invoiced', 'ReceiptMismatch'].includes(order.status) && (
                <form onSubmit={(event) => issueInvoice(order, event)} className="mt-4 space-y-3 rounded-xl border border-teal-100 bg-teal-50/50 p-4">
                  <p className="text-xs font-bold text-slate-700">{order.invoice_number ? 'Revise invoice' : 'Issue invoice after accepting'}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Quantity ({order.unit})
                      <input name="quantity" type="number" min="1" max="500" required defaultValue={order.invoice_quantity || order.quantity} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                      Price per unit (₹)
                      <input name="unitPrice" type="number" min="0.01" step="0.01" required defaultValue={order.invoice_unit_price || order.unit_price} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                  </div>
                  <button type="submit" disabled={busyOrderId === order.id} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50">
                    <FileText className="h-4 w-4" /> {busyOrderId === order.id ? 'Issuing...' : 'Issue invoice'}
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default RetailOrders;
