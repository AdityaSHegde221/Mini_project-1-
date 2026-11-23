import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { Truck, Receipt, CreditCard, ExternalLink } from 'lucide-react';

export const PurchaseOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/shopkeeper/orders');
        setOrders(res.data.orders);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load purchase order history.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Confirmed Purchase Orders</h1>
        <p className="text-xs text-slate-500">Order history by vendor, with shipment progress, invoice, payment transaction and e-bill.</p>
      </div>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-medium">
              No purchase orders placed yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Ordered</th>
                  <th className="px-6 py-4">Request Code</th>
                  <th className="px-6 py-4">Supplier / Vendor</th>
                  <th className="px-6 py-4">Product & Qty</th>
                  <th className="px-6 py-4">Total Amount</th>
                  <th className="px-6 py-4">Shopkeeper GRN</th>
                  <th className="px-6 py-4">Invoice / Payment</th>
                  <th className="px-6 py-4">Order Status</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{po.po_number}</td>
                    <td className="px-6 py-4 text-slate-600">{po.order_date ? new Date(po.order_date).toLocaleString() : '—'}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{po.request_code}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{po.vendor_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{po.product_name}</p>
                      <p className="text-[11px] text-slate-400">{po.quantity} units @ ₹{Number(po.unit_price).toFixed(2)}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-navy-900 text-sm">
                      ₹{Number(po.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {po.grn_number ? (
                        <span className="inline-flex items-center text-teal-700 font-semibold">
                          <Truck className="w-3.5 h-3.5 mr-1" /> {po.grn_number} ({po.grn_status})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Awaiting delivery confirmation</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {po.payment_number ? (
                        <span className="inline-flex items-center text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CreditCard className="w-3 h-3 mr-1" /> Paid
                        </span>
                      ) : po.invoice_number ? (
                        <span className="inline-flex items-center text-amber-700 font-semibold">
                          <Receipt className="w-3.5 h-3.5 mr-1" /> Billed ({po.invoice_number})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending invoice</span>
                      )}
                      <p className="mt-1 text-[10px] text-slate-500">
                        Finance: {po.reconciliation_status || (po.grn_id && po.invoice_id ? 'Ready for review' : 'Waiting for GRN and invoice')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={po.status} />
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/shopkeeper/orders/${po.id}`} className="inline-flex items-center gap-1 rounded-lg border border-teal-200 px-3 py-1.5 font-bold text-teal-700 hover:bg-teal-50">
                        <ExternalLink className="h-3 w-3" /> Order / e-bill
                      </Link>
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

export default PurchaseOrders;
