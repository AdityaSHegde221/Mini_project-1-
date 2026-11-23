import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { Truck, ClipboardCheck, CheckCircle2, AlertCircle, X, ShieldAlert } from 'lucide-react';

export const IncomingOrders = () => {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeModalOrder, setActiveModalOrder] = useState(null);

  const [receivedQty, setReceivedQty] = useState(0);
  const [damagedQty, setDamagedQty] = useState(0);
  const [missingQty, setMissingQty] = useState(0);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/warehouse/incoming-orders');
      setOrders(res.data.incomingOrders);

      // Auto-open modal if poId is in query param
      const targetPoId = searchParams.get('poId');
      if (targetPoId) {
        const found = res.data.incomingOrders.find(o => String(o.id) === String(targetPoId));
        if (found) {
          handleOpenModal(found);
        }
      }
    } catch (err) {
      console.error('Failed to load incoming orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenModal = (order) => {
    setActiveModalOrder(order);
    setReceivedQty(order.quantity); // Default to full receipt
    setDamagedQty(0);
    setMissingQty(0);
    setRemarks('All boxes inspected intact at warehouse receiving bay.');
    setFeedback(null);
  };

  const handleLogGrn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    const r = Number(receivedQty);
    const d = Number(damagedQty);
    const m = Number(missingQty);

    if (r < 0 || d < 0 || m < 0) {
      setFeedback({ type: 'error', message: 'Quantities cannot be negative.' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await api.post('/warehouse/receipts', {
        poId: activeModalOrder.id,
        receivedQuantity: r,
        damagedQuantity: d,
        missingQuantity: m,
        remarks
      });

      const grn = res.data.goodsReceipt;
      setFeedback({
        type: 'success',
        message: `Goods Receipt Note ${grn.grn_number} created successfully! Status: ${grn.status}. Finance and Shopkeeper have been notified for 3-way reconciliation.`
      });
      setActiveModalOrder(null);
      fetchOrders();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to record goods receipt.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Incoming Deliveries & Goods Receipt</h1>
        <p className="text-xs text-slate-500">Inspect physical shipments, record accurate quantities, and issue official GRNs</p>
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
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
            <div className="p-8 text-center text-slate-400 text-xs">Loading dock schedule...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              No shipments awaiting goods receipt.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Vendor / Supplier</th>
                  <th className="px-6 py-4">Product Details</th>
                  <th className="px-6 py-4">Ordered Quantity</th>
                  <th className="px-6 py-4">Order Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Physical Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{po.po_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {po.vendor_name}
                      <span className="text-[11px] text-slate-400 block font-normal">{po.vendor_company}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {po.product_name}
                      <span className="text-[11px] text-slate-400 block font-normal">{po.product_category}</span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-navy-900 text-sm">
                      {po.quantity} {po.product_unit}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(po.order_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={po.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenModal(po)}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition shadow-sm inline-flex items-center space-x-1.5"
                      >
                        <ClipboardCheck className="w-4 h-4" />
                        <span>Log GRN</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* GRN Logging Modal */}
      {activeModalOrder && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-lg w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Goods Receipt Note</span>
                <h3 className="text-lg font-bold text-slate-900">Physical Delivery Inspection</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">PO: {activeModalOrder.po_number}</p>
              </div>
              <button onClick={() => setActiveModalOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs mb-4">
              <p><strong>Supplier:</strong> {activeModalOrder.vendor_name}</p>
              <p className="mt-0.5"><strong>Product:</strong> {activeModalOrder.product_name}</p>
              <p className="mt-0.5"><strong>Contracted PO Quantity:</strong> <span className="font-bold text-navy-900">{activeModalOrder.quantity} units</span></p>
            </div>

            <form onSubmit={handleLogGrn} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-emerald-700 mb-1">
                    Received (Good)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={receivedQty}
                    onChange={(e) => setReceivedQty(e.target.value)}
                    className="w-full px-3 py-2 bg-emerald-50/50 border border-emerald-200 rounded-xl font-bold text-emerald-800 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-rose-700 mb-1">
                    Damaged Items
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={damagedQty}
                    onChange={(e) => setDamagedQty(e.target.value)}
                    className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-xl font-bold text-rose-800 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-amber-700 mb-1">
                    Missing / Short
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={missingQty}
                    onChange={(e) => setMissingQty(e.target.value)}
                    className="w-full px-3 py-2 bg-amber-50/50 border border-amber-200 rounded-xl font-bold text-amber-800 text-sm focus:outline-none"
                  />
                </div>
              </div>

              {(Number(damagedQty) > 0 || Number(missingQty) > 0 || Number(receivedQty) !== Number(activeModalOrder.quantity)) && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start space-x-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    <strong>Discrepancy Detected:</strong> GRN will be flagged as Discrepancy. Finance 3-way reconciliation will detect this and automatically block full payment until resolved.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Inspection Remarks / Bay Notes
                </label>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Inspected at Dock 3. Outer carton intact, serial numbers checked."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 resize-none font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModalOrder(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 font-bold rounded-xl text-slate-950 transition shadow flex items-center space-x-1.5"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>{submitting ? 'Generating GRN...' : 'Commit Goods Receipt (GRN)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingOrders;
