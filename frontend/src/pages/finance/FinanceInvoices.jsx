import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { Receipt, CreditCard } from 'lucide-react';

export const FinanceInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const res = await api.get('/finance/invoices');
        setInvoices(res.data.invoices);
      } catch (err) {
        console.error('Failed to load invoices:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Vendor Invoices Ledger</h1>
        <p className="text-xs text-slate-500">Commercial invoices submitted by vendors awaiting reconciliation & payment</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">No invoices found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Invoice Number</th>
                  <th className="px-6 py-4">Purchase Order</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Product Billed</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Billed Amount</th>
                  <th className="px-6 py-4">Payment Voucher</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{inv.invoice_number}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{inv.po_number}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{inv.vendor_name}</td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{inv.product_name}</td>
                    <td className="px-6 py-4">{inv.quantity} units</td>
                    <td className="px-6 py-4 font-mono font-bold text-navy-900 text-sm">
                      ₹{Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {inv.payment_number ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {inv.payment_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unpaid</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={inv.status} />
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

export default FinanceInvoices;
