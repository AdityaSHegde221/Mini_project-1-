import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { FileSpreadsheet, Scale, Truck, Receipt } from 'lucide-react';

export const FinanceOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get('/finance/purchase-orders');
        setOrders(res.data.orders);
      } catch (err) {
        console.error('Failed to load orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Purchase Orders Financial Ledger</h1>
        <p className="text-xs text-slate-500">Monitor financial commitments across all issued purchase orders</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">No purchase orders found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">PO Number</th>
                  <th className="px-6 py-4">Beneficiary Vendor</th>
                  <th className="px-6 py-4">Item & Quantity</th>
                  <th className="px-6 py-4">Contract Value</th>
                  <th className="px-6 py-4">Goods Receipt</th>
                  <th className="px-6 py-4">Vendor Invoice</th>
                  <th className="px-6 py-4">Audit Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{po.po_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{po.vendor_name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {po.product_name} ({po.quantity} units)
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-navy-900 text-sm">
                      ₹{Number(po.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {po.grn_number ? (
                        <span className="font-mono text-teal-700 font-semibold">
                          {po.grn_number}
                          <span className="mt-1 block font-sans text-[10px] text-slate-500">{po.grn_received_by_role} · {po.grn_received_by}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending GRN</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {po.invoice_number ? (
                        <span className="font-mono text-purple-700 font-semibold">{po.invoice_number}</span>
                      ) : (
                        <span className="text-slate-400 italic">No Invoice</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={po.reconciliation_status || 'Unreconciled'} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/finance/reconciliation?poId=${po.id}`}
                        className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg font-bold transition inline-flex items-center space-x-1"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Audit</span>
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

export default FinanceOrders;
