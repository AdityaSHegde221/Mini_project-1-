import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { FileCheck, Receipt, PlusCircle, CheckCircle2, AlertCircle, X, Truck } from 'lucide-react';

export const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [invoiceModalPo, setInvoiceModalPo] = useState(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceQty, setInvoiceQty] = useState(0);
  const [invoicePrice, setInvoicePrice] = useState(0);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [dispatching, setDispatching] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/vendor/orders');
      setOrders(res.data.orders);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to load vendor purchase orders.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenInvoiceModal = (po) => {
    setInvoiceModalPo(po);
    const generatedInv = `INV-${Date.now().toString().slice(-6)}`;
    setInvoiceNumber(generatedInv);
    setInvoiceQty(po.quantity);
    setInvoicePrice(Number(po.unit_price));
    setInvoiceTotal(Number(po.total_amount));
    setFeedback(null);
  };

  const handleQtyPriceChange = (q, p) => {
    setInvoiceQty(q);
    setInvoicePrice(p);
    setInvoiceTotal(Number(q) * Number(p));
  };

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.post('/vendor/invoices', {
        poId: invoiceModalPo.id,
        invoiceNumber,
        quantity: Number(invoiceQty),
        unitPrice: Number(invoicePrice),
        totalAmount: Number(invoiceTotal),
        invoiceDate
      });

      setFeedback({
        type: 'success',
        message: `Invoice ${invoiceNumber} created and submitted successfully! Finance Department has been notified for three-way reconciliation.`
      });
      setInvoiceModalPo(null);
      fetchOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit invoice.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispatchOrder = async (po) => {
    setDispatching(po.id);
    setFeedback(null);
    try {
      const response = await api.patch(`/vendor/orders/${po.id}/dispatch`);
      setFeedback({ type: 'success', message: response.data.message });
      await fetchOrders();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Could not mark this order as dispatched.'
      });
    } finally {
      setDispatching(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Purchase Orders & Invoicing</h1>
        <p className="text-xs text-slate-500">
          Dispatch shopkeeper purchase orders, then submit invoices. Shopkeepers record the GRN before Finance performs the three-way match.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-medium flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              No confirmed purchase orders yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Request Code</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Delivery status</th>
                  <th className="px-6 py-4">Ordered Quantity</th>
                  <th className="px-6 py-4">Unit Price</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Shopkeeper GRN</th>
                  <th className="px-6 py-4">Invoice Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{po.po_number}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{po.request_code}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{po.product_name}</td>
                    <td className="px-6 py-4">
                      <Badge status={po.status} />
                      {po.grn_number && <span className="mt-1 block text-[10px] text-slate-500">GRN {po.grn_number} · {po.received_quantity} received</span>}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{po.quantity} {po.product_unit}</td>
                    <td className="px-6 py-4 font-mono">₹{Number(po.unit_price).toFixed(2)}</td>
                    <td className="px-6 py-4 font-mono font-bold text-navy-900 text-sm">
                      ₹{Number(po.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {po.grn_number ? (
                        <span className="inline-flex items-center text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          <Truck className="w-3.5 h-3.5 mr-1" /> {po.grn_number} ({po.grn_status})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting shopkeeper</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {po.invoice_number ? (
                        <span className="font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {po.invoice_number} ({po.invoice_status})
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Not Invoiced
                        </span>
                      )}
                      {po.reconciliation_status && <span className="mt-1 block text-[10px] text-slate-500">Finance: {po.reconciliation_status}</span>}
                      {po.payment_number && <span className="mt-1 block text-[10px] font-semibold text-emerald-700">Payment: {po.payment_number} ({po.payment_status})</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {po.status === 'Confirmed' && (
                          <button
                            type="button"
                            disabled={dispatching !== null}
                            onClick={() => handleDispatchOrder(po)}
                            className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white disabled:opacity-50"
                          >
                            {dispatching === po.id ? 'Updating...' : 'Mark dispatched'}
                          </button>
                        )}
                        {!po.invoice_number && ['Shipped', 'Received'].includes(po.status) ? (
                          <button
                            onClick={() => handleOpenInvoiceModal(po)}
                            className="inline-flex items-center space-x-1 rounded-lg bg-teal-600 px-3 py-1.5 font-bold text-white shadow-sm transition hover:bg-teal-700"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                            <span>Submit Invoice</span>
                          </button>
                        ) : !po.invoice_number ? (
                          <span className="max-w-40 text-right text-[10px] text-slate-500">Dispatch this PO before submitting the invoice.</span>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">Invoice Submitted</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Invoice Submission Modal */}
      {invoiceModalPo && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Generate Vendor Invoice</h3>
                <p className="text-xs text-slate-500">For Purchase Order: <strong className="font-mono">{invoiceModalPo.po_number}</strong></p>
              </div>
              <button onClick={() => setInvoiceModalPo(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Invoice Number / Code
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-navy-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Billed Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={invoiceQty}
                    onChange={(e) => handleQtyPriceChange(e.target.value, invoicePrice)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={invoicePrice}
                    onChange={(e) => handleQtyPriceChange(invoiceQty, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Total Invoice Amount (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={invoiceTotal}
                  onChange={(e) => setInvoiceTotal(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-extrabold text-navy-900 text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Tip: Finance 3-way matching will verify that quantity and amount match PO and GRN exactly.
                </span>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInvoiceModalPo(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 font-bold rounded-xl text-white transition shadow flex items-center space-x-1"
                >
                  <Receipt className="w-3.5 h-3.5 mr-1" />
                  <span>{submitting ? 'Submitting...' : 'Submit to Finance'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorOrders;
