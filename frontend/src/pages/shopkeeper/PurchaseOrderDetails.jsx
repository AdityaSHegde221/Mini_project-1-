import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { ArrowLeft, CheckCircle2, Printer, Truck } from 'lucide-react';

const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

const PurchaseOrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [damagedQuantity, setDamagedQuantity] = useState('0');
  const [receiptRemarks, setReceiptRemarks] = useState('');

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/shopkeeper/orders/${id}`);
      setOrder(response.data.order);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not load this purchase order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const confirmReceipt = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await api.patch(`/shopkeeper/orders/${id}/received`, {
        receivedQuantity: receivedQuantity === '' ? Number(order.quantity) : Number(receivedQuantity),
        damagedQuantity: Number(damagedQuantity),
        remarks: receiptRemarks
      });
      setMessage(response.data.message);
      await fetchOrder();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not confirm delivery.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-xs text-slate-500">Loading purchase order...</div>;
  if (!order) return <div className="space-y-4"><p role="alert" className="rounded-xl bg-rose-50 p-4 text-xs text-rose-800">{error || 'Purchase order not found.'}</p><Link to="/shopkeeper/orders" className="text-xs font-bold text-teal-700">Back to orders</Link></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link to="/shopkeeper/orders" className="inline-flex items-center gap-1 text-xs font-bold text-teal-700"><ArrowLeft className="h-3.5 w-3.5" /> Purchase orders</Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Order & e-bill</h1>
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"><Printer className="h-4 w-4" /> Print / save e-bill</button>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 print:hidden">{error}</div>}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 print:hidden">{message}</div>}

      <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-teal-700">Electronic purchase bill</p>
            <h2 className="mt-1 font-mono text-xl font-extrabold text-slate-900">{order.invoice_number || order.po_number}</h2>
            <p className="mt-1 text-xs text-slate-500">Purchase order {order.po_number} · Ordered {formatDate(order.order_date)}</p>
          </div>
          <Badge status={order.status} />
        </header>

        <div className="grid gap-5 py-5 sm:grid-cols-2">
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Supplier</h3>
            <p className="mt-2 text-sm font-bold text-slate-800">{order.vendor_company || order.vendor_name}</p>
            <p className="mt-1 text-xs text-slate-600">{order.vendor_name}</p>
            {order.vendor_phone && <p className="mt-1 text-xs text-slate-600">{order.vendor_phone}</p>}
            {order.vendor_address && <p className="mt-1 text-xs text-slate-600">{order.vendor_address}</p>}
          </section>
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shop</h3>
            <p className="mt-2 text-sm font-bold text-slate-800">{order.store_name || 'Shop'}{order.branch ? ` · ${order.branch}` : ''}</p>
            <p className="mt-1 text-xs text-slate-600">{order.shopkeeper_name}</p>
            {order.shopkeeper_phone && <p className="mt-1 text-xs text-slate-600">{order.shopkeeper_phone}</p>}
            {order.shop_address && <p className="mt-1 text-xs text-slate-600">{order.shop_address}</p>}
          </section>
        </div>

        <div className="overflow-x-auto border-y border-slate-200 py-4">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="py-2">Product</th><th className="py-2">Quantity</th><th className="py-2">Unit price</th><th className="py-2 text-right">Amount</th></tr></thead>
            <tbody><tr className="font-semibold text-slate-800"><td className="py-3">{order.product_name}</td><td className="py-3">{order.quantity} {order.product_unit}</td><td className="py-3">₹{Number(order.unit_price).toFixed(2)}</td><td className="py-3 text-right">₹{Number(order.total_amount).toFixed(2)}</td></tr></tbody>
            <tfoot><tr className="border-t border-slate-100 font-extrabold text-slate-900"><td colSpan="3" className="py-3 text-right">Total</td><td className="py-3 text-right">₹{Number(order.total_amount).toFixed(2)}</td></tr></tfoot>
          </table>
        </div>

        <div className="grid gap-5 py-5 sm:grid-cols-2">
          <section className="rounded-xl bg-slate-50 p-4">
            <h3 className="text-xs font-bold text-slate-800">Shipment tracking</h3>
            <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700"><Truck className="h-3.5 w-3.5" /> {order.status}</p>
            {order.dispatched_at && <p className="mt-1 text-[11px] text-slate-600">Dispatched {formatDate(order.dispatched_at)}</p>}
            {order.received_at && <p className="mt-1 text-[11px] text-emerald-700">Received {formatDate(order.received_at)}</p>}
            <p className="mt-1 text-[11px] text-slate-500">Vendor dispatches the goods and submits an invoice. Record the actual received quantity here to create the GRN for Finance.</p>
            {order.status === 'Shipped' && !order.invoice_number && (
              <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] text-amber-800">Waiting for the vendor to submit its invoice after dispatch.</p>
            )}
            {order.status === 'Shipped' && order.invoice_number && (
              <form onSubmit={confirmReceipt} className="mt-3 space-y-3 rounded-lg border border-teal-100 bg-white p-3 print:hidden">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Actual quantity received ({order.product_unit})
                  <input
                    type="number"
                    min="0"
                    max={order.quantity}
                    step="1"
                    required
                    value={receivedQuantity === '' ? String(order.quantity) : receivedQuantity}
                    onChange={(event) => setReceivedQuantity(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Damaged quantity
                  <input
                    type="number"
                    min="0"
                    max={receivedQuantity === '' ? order.quantity : receivedQuantity}
                    step="1"
                    required
                    value={damagedQuantity}
                    onChange={(event) => setDamagedQuantity(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Receipt remarks (optional)
                  <input
                    value={receiptRemarks}
                    maxLength={2000}
                    onChange={(event) => setReceiptRemarks(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  />
                </label>
                <p className="text-[10px] text-slate-500">Missing units are calculated from the PO quantity. Confirm only after physically checking this delivery.</p>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-50">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {saving ? 'Saving GRN...' : 'Confirm quantity & create GRN'}
                </button>
              </form>
            )}
            {order.grn_number && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3 text-[11px]">
                <p className="font-bold text-slate-800">GRN {order.grn_number} · {order.grn_status}</p>
                <p className="mt-1 text-slate-600">
                  {order.grn_received_quantity} received · {order.grn_damaged_quantity} damaged · {order.grn_missing_quantity} missing
                </p>
                <p className="mt-1 text-slate-500">
                  Recorded by {order.grn_received_by_name || 'receiver'} ({order.grn_received_by_role || 'Receiver'}) · {formatDate(order.receipt_date)}
                </p>
              </div>
            )}
            {order.status === 'Received' && <p className="mt-2 text-xs font-bold text-emerald-700">GRN sent to Finance for three-way review.</p>}
          </section>
          <section className="rounded-xl bg-slate-50 p-4">
            <h3 className="text-xs font-bold text-slate-800">Vendor invoice</h3>
            <p className="mt-2 text-xs text-slate-700">Number: <strong>{order.invoice_number || 'Not submitted'}</strong></p>
            <p className="mt-1 text-xs text-slate-700">Status: <strong>{order.invoice_status || 'Pending'}</strong></p>
            <p className="mt-1 text-xs text-slate-700">Invoice date: <strong>{order.invoice_date ? new Date(`${order.invoice_date}T00:00:00`).toLocaleDateString() : '—'}</strong></p>
            <p className="mt-1 text-xs text-slate-700">Invoice amount: <strong>{order.invoice_amount ? `₹${Number(order.invoice_amount).toFixed(2)}` : '—'}</strong></p>
          </section>
        </div>

        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-bold text-slate-800">Finance three-way review</h3>
          {order.reconciliation_status ? (
            <div className="mt-2 space-y-1 text-xs">
              <p>Status: <strong>{order.reconciliation_status}</strong></p>
              {order.is_matched ? (
                <p className="font-semibold text-emerald-700">PO, GRN and invoice match. Finance can record the payment.</p>
              ) : (
                <p className="font-semibold text-rose-700">Payment is on hold until Finance resolves the mismatch.</p>
              )}
              {order.discrepancy_details && <p className="text-slate-600">{order.discrepancy_details}</p>}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              {order.grn_number && order.invoice_number
                ? 'PO, GRN and invoice are ready for Finance review.'
                : 'Finance review starts after the vendor invoice and shopkeeper GRN are both recorded.'}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-xs font-bold text-slate-800">Payment transaction</h3>
          {order.payment_number ? (
            <div className="mt-2 grid gap-2 text-xs text-slate-700 sm:grid-cols-2">
              <p>Transaction: <strong>{order.payment_number}</strong></p>
              <p>Status: <strong>{order.payment_status}</strong></p>
              <p>Method: <strong>{order.payment_method}</strong></p>
              <p>Reference: <strong>{order.reference_number}</strong></p>
              <p>Amount: <strong>₹{Number(order.payment_amount).toFixed(2)}</strong></p>
              <p>Paid on: <strong>{formatDate(order.payment_date)}</strong></p>
            </div>
          ) : <p className="mt-2 text-xs text-slate-500">No payment transaction has been recorded yet.</p>}
        </section>

      </article>
    </div>
  );
};

export default PurchaseOrderDetails;
