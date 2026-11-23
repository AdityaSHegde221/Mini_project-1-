import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { ArrowRight, CheckCircle2, CreditCard, PackageCheck, RefreshCw, Store } from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusClass = (status) => {
  if (status === 'Rejected' || status === 'ReceiptMismatch') return 'bg-rose-50 text-rose-700';
  if (status === 'Completed') return 'bg-emerald-50 text-emerald-700';
  if (status === 'Accepted' || status === 'Invoiced' || status === 'ReceiptConfirmed') return 'bg-blue-50 text-blue-700';
  return 'bg-amber-50 text-amber-800';
};

const CustomerOrders = () => {
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState({});
  const [receivedQuantities, setReceivedQuantities] = useState({});
  const [paymentMethods, setPaymentMethods] = useState({});
  const [paymentReferences, setPaymentReferences] = useState({});

  const loadOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await api.get('/customer/retail-orders');
      setOrders(response.data.orders || []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load your purchase journey.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (loading || !location.hash) return;
    const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    const shopDetails = target?.closest('details');
    if (shopDetails) shopDetails.open = true;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading, location.hash, orders]);

  const shopGroups = useMemo(() => {
    const groups = new Map();
    const journeyOrders = orders.filter((order) => order.status === 'Completed');
    for (const order of journeyOrders) {
      const key = String(order.shopkeeper_id);
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          storeName: order.store_name,
          branch: order.branch,
          orders: [],
        });
      }
      groups.get(key).orders.push(order);
    }
    return Array.from(groups.values());
  }, [orders]);

  const activeOrders = useMemo(
    () => orders.filter((order) => !['Completed', 'Rejected'].includes(order.status)),
    [orders]
  );

  const confirmReceipt = async (order, event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const receivedQuantity = Number(formData.get('receivedQuantity'));
    setBusyOrderId(order.id);
    setMessages((current) => ({ ...current, [order.id]: null }));
    try {
      const response = await api.post(`/customer/retail-orders/${order.id}/receipt`, { receivedQuantity });
      setMessages((current) => ({ ...current, [order.id]: { success: response.data.message } }));
      await loadOrders(true);
    } catch (requestError) {
      setMessages((current) => ({
        ...current,
        [order.id]: { error: requestError.response?.data?.message || 'Could not confirm receipt. Please try again.' }
      }));
      await loadOrders(true);
    } finally {
      setBusyOrderId(null);
    }
  };

  const submitPayment = async (order, event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusyOrderId(order.id);
    setMessages((current) => ({ ...current, [order.id]: null }));
    try {
      const response = await api.post(`/customer/retail-orders/${order.id}/payments`, {
        paymentMethod: formData.get('paymentMethod'),
        referenceNumber: formData.get('referenceNumber'),
      });
      setMessages((current) => ({ ...current, [order.id]: { success: response.data.message } }));
      await loadOrders(true);
    } catch (requestError) {
      setMessages((current) => ({
        ...current,
        [order.id]: { error: requestError.response?.data?.message || 'Could not record payment. Please try again.' }
      }));
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Customer purchase journey</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">Purchase Journey</h1>
          <p className="mt-2 text-sm text-slate-500">Only purchases with recorded payment appear here. Open a shop to see every product you bought there.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => loadOrders(true)} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh status
          </button>
          <Link to="/customer/payments" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">
            <CreditCard className="h-4 w-4" /> Payment history
          </Link>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading orders...</div>
      ) : shopGroups.length === 0 && activeOrders.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <PackageCheck className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 font-bold text-slate-700">No paid purchases yet</p>
          <p className="mt-1 text-xs text-slate-500">Track orders, confirm receipt, and record payment in My Orders & Requests. Paid purchases will appear here grouped by shop.</p>
          <Link to="/customer/home" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white">
            Browse groceries <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrders.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Orders in progress</h2>
                <p className="mt-1 text-xs text-slate-500">Follow each order through shop approval, invoice, receipt confirmation, and payment.</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {activeOrders.map((order) => (
                  <article key={order.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-[11px] font-bold text-emerald-700">{order.order_number}</p>
                        <h3 className="mt-1 text-sm font-black text-slate-900">{order.product_name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {order.store_name}{order.branch ? ` · ${order.branch}` : ''}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClass(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                      <span className="text-xs font-semibold text-slate-600">
                        {order.quantity} {order.unit} · {money(order.invoice_total || order.total_amount)}
                      </span>
                      <Link
                        to={`/customer/retail-orders/${order.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-emerald-700"
                      >
                        Continue journey <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {shopGroups.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <PackageCheck className="mx-auto h-9 w-9 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-slate-700">No completed paid purchases yet</p>
              <p className="mt-1 text-xs text-slate-500">Your completed purchases will be grouped by shop here after payment is recorded.</p>
            </div>
          ) : null}

          {shopGroups.map((shop) => {
            const progressSteps = [
              { label: 'Request', done: true },
              { label: 'Shop review', done: shop.orders.every((order) => order.status !== 'Interested') },
              { label: 'Invoice', done: shop.orders.every((order) => Boolean(order.invoice_number)) },
              { label: 'Receipt', done: shop.orders.every((order) => ['ReceiptConfirmed', 'Completed'].includes(order.status)) },
              { label: 'Payment', done: shop.orders.every((order) => order.status === 'Completed') },
            ];
            return (
              <details id={`shop-${shop.id}`} key={shop.id} className="group scroll-mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50 sm:p-5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-base font-black text-slate-900">
                      <Store className="h-4 w-4 shrink-0 text-emerald-700" />
                      {shop.storeName}{shop.branch ? ` · ${shop.branch}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {shop.orders.length} paid product{shop.orders.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                    View paid products
                    <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                  </span>
                </summary>
                <div className="space-y-4 border-t border-slate-100 bg-slate-50/60 p-4 sm:p-5">
                  <section aria-label={`${shop.storeName} completed purchase progress`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="mb-3 text-sm font-extrabold text-slate-900">Completed purchase progress</h2>
                    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                      {progressSteps.map((step) => (
                        <li key={step.label} className={`rounded-lg px-3 py-2 text-xs font-bold ${step.done ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                          <span className="mr-1.5">{step.done ? '✓' : '○'}</span>{step.label}
                        </li>
                      ))}
                    </ol>
                  </section>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {shop.orders.map((order) => {
            const message = messages[order.id];
            const paymentMethod = paymentMethods[order.id] || 'Cash';
            const needsReceipt = ['Invoiced', 'ReceiptMismatch'].includes(order.status);
            return (
              <article id={`order-${order.id}`} key={order.id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-emerald-700">{order.order_number}</p>
                    <h2 className="mt-1 text-base font-black text-slate-900">{order.product_name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Store className="h-3.5 w-3.5" /> {order.store_name}{order.branch ? ` · ${order.branch}` : ''}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold ${statusClass(order.status)}`}>{order.status}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-xs">
                  <div><p className="text-slate-400">Requested quantity</p><p className="mt-1 font-bold text-slate-800">{order.quantity} {order.unit}</p></div>
                  <div><p className="text-slate-400">Shop price</p><p className="mt-1 font-bold text-slate-800">{money(order.unit_price)} / {order.unit}</p></div>
                  <div><p className="text-slate-400">Order total</p><p className="mt-1 font-bold text-slate-800">{money(order.total_amount)}</p></div>
                  <div><p className="text-slate-400">Requested</p><p className="mt-1 font-bold text-slate-800">{new Date(order.created_at).toLocaleDateString('en-IN')}</p></div>
                </div>

                {order.status === 'Interested' && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Waiting for the shopkeeper to confirm or decline this request. Refresh status to check for an update.</p>}
                {order.status === 'Accepted' && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">Your order is confirmed and the listed stock has been reserved. Waiting for the shopkeeper to issue your invoice.</p>}
                {order.status === 'Rejected' && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-800">The shopkeeper could not confirm this request. You can choose another shop from the grocery comparison.</p>}

                {order.invoice_number && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                    <p className="font-bold text-slate-800">Invoice {order.invoice_number}</p>
                    <p className="mt-1 text-slate-600">{order.invoice_quantity} {order.unit} × {money(order.invoice_unit_price)} = <strong>{money(order.invoice_total)}</strong></p>
                  </div>
                )}

                {needsReceipt && (
                  <form onSubmit={(event) => confirmReceipt(order, event)} className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                    <label className="block text-xs font-bold text-slate-700">
                      After you receive and check this grocery, enter the quantity received ({order.unit})
                      <input
                        name="receivedQuantity"
                        type="number"
                        min="0"
                        max="500"
                        required
                        value={receivedQuantities[order.id] ?? String(order.invoice_quantity ?? order.quantity)}
                        onChange={(event) => setReceivedQuantities((current) => ({ ...current, [order.id]: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                      />
                    </label>
                    <p className="text-[11px] text-slate-600">Confirm only after you have received the products. Payment is enabled only when the received quantity matches the order and invoice.</p>
                    <button type="submit" disabled={busyOrderId === order.id} className="rounded-lg bg-blue-700 px-4 py-2 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50">
                      {busyOrderId === order.id ? 'Checking receipt...' : 'Confirm received products'}
                    </button>
                  </form>
                )}

                {order.status === 'ReceiptMismatch' && order.mismatch_details && (
                  <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{order.mismatch_details} Check your invoice and try confirming the actual received quantity again.</p>
                )}

                {order.status === 'ReceiptConfirmed' && order.receipt_matched && (
                  <form onSubmit={(event) => submitPayment(order, event)} className="mt-4 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
                    <p className="flex items-center gap-2 text-xs font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Receipt matches the order and shop invoice.</p>
                    <label className="block text-xs font-bold text-slate-700">
                      Payment method
                      <select
                        name="paymentMethod"
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethods((current) => ({ ...current, [order.id]: event.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                      >
                        {['Cash', 'UPI', 'Card', 'Bank transfer', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
                      </select>
                    </label>
                    {paymentMethod !== 'Cash' && (
                      <label className="block text-xs font-bold text-slate-700">
                        Payment reference
                        <input
                          name="referenceNumber"
                          required
                          maxLength="100"
                          value={paymentReferences[order.id] || ''}
                          onChange={(event) => setPaymentReferences((current) => ({ ...current, [order.id]: event.target.value }))}
                          placeholder="Enter transaction/reference number"
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </label>
                    )}
                    <p className="text-xs text-slate-700">Record payment of <strong>{money(order.invoice_total)}</strong> only after paying the shopkeeper.</p>
                    <button type="submit" disabled={busyOrderId === order.id} className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 disabled:opacity-50">
                      {busyOrderId === order.id ? 'Recording payment...' : 'Record payment'}
                    </button>
                  </form>
                )}

                {order.status === 'Completed' && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                    <p className="font-bold">Purchase completed{order.payment_number ? ` · ${order.payment_number}` : ''}</p>
                    {order.payment_amount && <p className="mt-1">Paid {money(order.payment_amount)} by {order.payment_method}.</p>}
                    <Link to="/customer/payments" className="mt-2 inline-flex items-center gap-1 font-bold underline">
                      View payment history <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}

                {message?.error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{message.error}</p>}
                {message?.success && <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">{message.success}</p>}
              </article>
            );
                    })}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerOrders;
