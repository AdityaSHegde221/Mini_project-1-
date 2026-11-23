import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, CheckCircle2, CreditCard, RefreshCw, Store } from 'lucide-react';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (value) => {
  if (!value) return 'Not available yet';
  const date = new Date(value);
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatDateTime = (value) => {
  if (!value) return 'Not available yet';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getCollectionDeadline = (readyDate) => {
  if (!readyDate) return null;
  const deadline = new Date(readyDate);
  deadline.setUTCDate(deadline.getUTCDate() + 3);
  return deadline;
};

const RetailOrderTrack = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');

  const loadOrder = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const response = await api.get(`/customer/retail-orders/${id}`);
      setOrder(response.data.order);
      setReceivedQuantity(String(response.data.order.invoice_quantity ?? response.data.order.quantity));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this order’s tracking details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const collectionDeadline = useMemo(
    () => getCollectionDeadline(order?.invoice_issued_at),
    [order?.invoice_issued_at]
  );

  const submitAction = async (event, action) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const endpoint = action === 'receipt' ? 'receipt' : 'payments';
      const body = action === 'receipt'
        ? { receivedQuantity: Number(receivedQuantity) }
        : { paymentMethod, referenceNumber };
      const response = await api.post(`/customer/retail-orders/${id}/${endpoint}`, body);
      setMessage(response.data.message);
      await loadOrder(true);
    } catch (requestError) {
      await loadOrder(true);
      setError(requestError.response?.data?.message || 'Could not update this order. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading order tracking...</div>;
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Link to="/customer/requests" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700">
          <ArrowLeft className="h-4 w-4" /> Back to My Orders & Requests
        </Link>
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error || 'Order not found.'}</p>
      </div>
    );
  }

  const approved = ['Accepted', 'Invoiced', 'ReceiptMismatch', 'ReceiptConfirmed', 'Completed'].includes(order.status);
  const ready = Boolean(order.invoice_issued_at);
  const received = ['ReceiptConfirmed', 'Completed'].includes(order.status);
  const paid = order.status === 'Completed';
  const steps = [
    { title: 'Order placed', date: order.created_at, complete: true },
    { title: 'Shopkeeper approval', date: order.shop_decided_at, complete: approved, failed: order.status === 'Rejected' },
    { title: 'Ready to take', date: order.invoice_issued_at, complete: ready },
    { title: 'Receipt confirmed', date: order.receipt_confirmed_at, complete: received },
    { title: 'Payment complete', date: order.payment_date, complete: paid },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/customer/requests" className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-emerald-700">
          <ArrowLeft className="h-4 w-4" /> Back to My Orders & Requests
        </Link>
        <button
          type="button"
          onClick={() => loadOrder(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh status
        </button>
      </div>

      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-bold text-emerald-700">{order.order_number}</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{order.product_name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <Store className="h-4 w-4" /> {order.store_name}{order.branch ? ` · ${order.branch}` : ''}
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-700">{order.status}</span>
        </div>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Order placed</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{formatDateTime(order.created_at)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ready to take</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{ready ? formatDateTime(order.invoice_issued_at) : 'Waiting for shopkeeper invoice'}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Last date to take</p>
            <p className="mt-1 text-sm font-bold text-amber-900">{collectionDeadline ? formatDate(collectionDeadline.toISOString()) : 'Set when the order is ready'}</p>
            {collectionDeadline && <p className="mt-1 text-[11px] text-amber-800">Please collect within 3 calendar days of the ready date.</p>}
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Quantity</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{order.quantity} {order.unit}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Purchase date</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{paid ? formatDateTime(order.payment_date) : 'Recorded after payment'}</p>
          </div>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="text-lg font-extrabold text-slate-900">Order progress</h2>
        {order.status === 'Rejected' && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">The shopkeeper declined this request.</p>}
        {order.status === 'Interested' && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Waiting for the shopkeeper to approve or decline this order.</p>}
        <ol className="mt-4 space-y-3">
          {steps.map((step) => (
            <li key={step.title} className="flex gap-3">
              <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${step.complete ? 'text-emerald-600' : step.failed ? 'text-rose-500' : 'text-slate-300'}`} />
              <div>
                <p className={`text-sm font-bold ${step.complete ? 'text-slate-900' : step.failed ? 'text-rose-700' : 'text-slate-500'}`}>{step.title}</p>
                <p className="text-xs text-slate-500">{step.failed ? 'Declined' : step.complete ? formatDateTime(step.date) : 'Waiting'}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {order.invoice_number && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-lg font-extrabold text-slate-900">Invoice {order.invoice_number}</h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">Quantity</span><strong>{order.invoice_quantity} {order.unit}</strong></p>
            <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">Price per unit</span><strong>{money(order.invoice_unit_price)}</strong></p>
            <p className="rounded-xl bg-slate-50 p-3"><span className="block text-xs text-slate-500">Total</span><strong>{money(order.invoice_total)}</strong></p>
          </div>
        </section>
      )}

      {['Invoiced', 'ReceiptMismatch'].includes(order.status) && (
        <form onSubmit={(event) => submitAction(event, 'receipt')} className="space-y-3 rounded-3xl border border-blue-100 bg-blue-50/60 p-5 sm:p-7">
          <h2 className="font-extrabold text-slate-900">Confirm received products</h2>
          <label className="block text-sm font-semibold text-slate-700">
            Quantity received ({order.unit})
            <input
              type="number"
              min="0"
              max="500"
              required
              value={receivedQuantity}
              onChange={(event) => setReceivedQuantity(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
            />
          </label>
          <p className="text-xs text-slate-600">Confirm only after receiving and checking the grocery. Payment is enabled only when the received quantity matches the order and invoice.</p>
          {order.status === 'ReceiptMismatch' && order.mismatch_details && <p className="text-xs text-rose-700">{order.mismatch_details}</p>}
          <button type="submit" disabled={busy} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Checking...' : 'Confirm received products'}</button>
        </form>
      )}

      {order.status === 'ReceiptConfirmed' && order.receipt_matched && (
        <form onSubmit={(event) => submitAction(event, 'payment')} className="space-y-3 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-7">
          <h2 className="flex items-center gap-2 font-extrabold text-emerald-900"><CreditCard className="h-4 w-4" /> Record payment</h2>
          <p className="text-xs text-slate-700">Receipt matches the order and invoice. Record payment of <strong>{money(order.invoice_total)}</strong> only after paying the shopkeeper.</p>
          <label className="block text-sm font-semibold text-slate-700">
            Payment method
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              {['Cash', 'UPI', 'Card', 'Bank transfer', 'Other'].map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          {paymentMethod !== 'Cash' && (
            <label className="block text-sm font-semibold text-slate-700">
              Payment reference
              <input required maxLength="100" value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5" />
            </label>
          )}
          <button type="submit" disabled={busy} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">{busy ? 'Recording payment...' : 'Record payment'}</button>
        </form>
      )}

      {paid && (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-extrabold">Payment complete</p>
          <p className="mt-1 text-xs">Paid {money(order.payment_amount)} by {order.payment_method} on {formatDateTime(order.payment_date)}.</p>
          <Link to="/customer/orders" className="mt-3 inline-flex items-center gap-2 text-xs font-bold underline">View in Purchase Journey</Link>
        </section>
      )}
    </div>
  );
};

export default RetailOrderTrack;
