import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { PackageCheck, CheckCircle2 } from 'lucide-react';

export const FinanceReceipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceipts = async () => {
      try {
        const res = await api.get('/finance/receipts');
        setReceipts(res.data.receipts);
      } catch (err) {
        console.error('Failed to load receipts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReceipts();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse Goods Receipts (GRN)</h1>
        <p className="text-xs text-slate-500">Physical receipt records logged by warehouse staff for three-way matching</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading receipt records...</div>
          ) : receipts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">No goods receipts found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">GRN Number</th>
                  <th className="px-6 py-4">Purchase Order</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Received / Ordered</th>
                  <th className="px-6 py-4">Damaged / Missing</th>
                  <th className="px-6 py-4">Receipt Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {receipts.map((grn) => (
                  <tr key={grn.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{grn.grn_number}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{grn.po_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{grn.vendor_name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{grn.product_name}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-emerald-700">{grn.received_quantity}</span> / {grn.ordered_quantity} units
                    </td>
                    <td className="px-6 py-4">
                      {grn.damaged_quantity > 0 || grn.missing_quantity > 0 ? (
                        <span className="text-rose-600 font-bold">
                          {grn.damaged_quantity > 0 && `${grn.damaged_quantity} Damaged `}
                          {grn.missing_quantity > 0 && `${grn.missing_quantity} Missing`}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Intact
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{new Date(grn.receipt_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Badge status={grn.status} />
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

export default FinanceReceipts;
