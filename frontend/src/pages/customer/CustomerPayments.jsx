import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Wallet, Receipt, Eye, X, Download, Store, Package, CreditCard, Calendar, FileText, AlertTriangle, Shield } from 'lucide-react';

export const CustomerPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billModal, setBillModal] = useState(null);
  const [billLoading, setBillLoading] = useState(false);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await api.get('/customer/payments');
        setPayments(res.data.payments);
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const viewEBill = async (paymentId) => {
    setBillLoading(true);
    try {
      const res = await api.get(`/customer/payments/${paymentId}/bill`);
      setBillModal(res.data.bill);
    } catch (err) {
      console.error('Failed to load e-bill:', err);
      alert('Could not load e-bill. Please try again.');
    } finally {
      setBillLoading(false);
    }
  };

  const printBill = () => {
    const printContent = document.getElementById('ebill-print-area');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>E-Bill - ${billModal.payment_number}</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1e293b; }
        .header { text-align: center; border-bottom: 2px solid #0d9488; padding-bottom: 20px; margin-bottom: 20px; }
        .header h1 { font-size: 24px; color: #0d9488; margin: 0; }
        .header p { color: #64748b; font-size: 12px; margin-top: 4px; }
        .section { margin-bottom: 20px; }
        .section h3 { font-size: 14px; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
        .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
        .row .label { color: #64748b; }
        .row .value { font-weight: 600; }
        .total { font-size: 20px; text-align: right; border-top: 2px solid #1e293b; padding-top: 10px; margin-top: 10px; }
        .footer { text-align: center; color: #94a3b8; font-size: 11px; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; }
        .audit { background: #fef3c7; padding: 10px; border-radius: 6px; font-size: 11px; color: #92400e; margin-top: 15px; }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            <span>Payment & Invoices</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Complete history of all payments made to shopkeepers with e-bill access</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-right">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Paid</span>
          <span className="text-2xl font-black text-slate-900 block mt-0.5">
            {'\u20B9'}{totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </span>
          <span className="text-xs text-slate-400">{payments.length} transaction{payments.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* E3 Audit Info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3">
        <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-amber-800">E3 Engine: Order-Receipt-Invoice Match</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Every payment is verified by 3-way matching between your order, the receipt confirmation, and the shopkeeper's invoice.
            Mismatch blocks payment automatically. The audit log is <strong>append-only</strong> — no update or delete operations are permitted (TC-E3-03, TC-E3-05).
          </p>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Transaction History</h2>
          <p className="text-xs text-slate-400 mt-0.5">Click "View E-Bill" to see detailed invoice for any transaction</p>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 mt-3">Loading payment history...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-600">No payments recorded yet</p>
            <p className="text-xs text-slate-400 mt-1">Complete a purchase with a shopkeeper to see your payment history here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Payment ID</th>
                  <th className="px-5 py-3.5">Product</th>
                  <th className="px-5 py-3.5">Shopkeeper</th>
                  <th className="px-5 py-3.5">Qty</th>
                  <th className="px-5 py-3.5">Unit Price</th>
                  <th className="px-5 py-3.5">Total Paid</th>
                  <th className="px-5 py-3.5">Method</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">E-Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-5 py-3.5 font-mono font-bold text-blue-700">{p.payment_number}</td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-800">{p.product_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{p.order_number}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-700">{p.store_name}</p>
                      {p.branch && <p className="text-[11px] text-slate-400">{p.branch}</p>}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-slate-700">{p.quantity} {p.unit}</td>
                    <td className="px-5 py-3.5 font-mono text-slate-700">
                      {'\u20B9'}{Number(p.unit_price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-700">
                      {'\u20B9'}{Number(p.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-semibold">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => viewEBill(p.id)}
                        disabled={billLoading}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg font-semibold hover:bg-blue-100 transition flex items-center space-x-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View E-Bill</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* E-Bill Modal */}
      {billModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-teal-600" />
                <span>E-Bill / Digital Invoice</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={printBill}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button onClick={() => setBillModal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Bill Content */}
            <div id="ebill-print-area" className="p-6 space-y-5">
              {/* Store Info */}
              <div className="header text-center border-b border-teal-500 pb-4">
                <h1 className="text-xl font-bold text-teal-700">FRESHCART - E-Bill</h1>
                <p className="text-xs text-slate-500 mt-1">Digital Invoice / Payment Receipt</p>
              </div>

              <div className="section">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">Shopkeeper Details</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Store</span>
                    <span className="font-semibold text-slate-800">{billModal.store_name}</span>
                  </div>
                  {billModal.branch && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Branch</span>
                      <span className="text-slate-700">{billModal.branch}</span>
                    </div>
                  )}
                  {billModal.shop_address && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Address</span>
                      <span className="text-slate-700 text-right max-w-[200px]">{billModal.shop_address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="section">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">Customer Details</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Name</span>
                    <span className="font-semibold text-slate-800">{billModal.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Email</span>
                    <span className="text-slate-700">{billModal.customer_email}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">Order & Product</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Order #</span>
                    <span className="font-mono font-bold text-slate-800">{billModal.order_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Product</span>
                    <span className="font-semibold text-slate-800">{billModal.product_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Quantity</span>
                    <span className="text-slate-700">{billModal.quantity} {billModal.unit}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">Invoice Details</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Invoice #</span>
                    <span className="font-mono font-bold text-teal-700">{billModal.invoice_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Unit Price</span>
                    <span className="text-slate-700">{'\u20B9'}{Number(billModal.unit_price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Invoice Qty</span>
                    <span className="text-slate-700">{billModal.invoice_quantity} {billModal.unit}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Issued</span>
                    <span className="text-slate-700">{new Date(billModal.issued_at).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="section">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">Payment Details</h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Payment #</span>
                    <span className="font-mono font-bold text-blue-700">{billModal.payment_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Method</span>
                    <span className="text-slate-700">{billModal.payment_method}</span>
                  </div>
                  {billModal.reference_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Reference</span>
                      <span className="font-mono text-slate-700">{billModal.reference_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Date</span>
                    <span className="text-slate-700">{new Date(billModal.payment_date).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Total */}
              <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">TOTAL PAID</span>
                <span className="text-2xl font-black text-emerald-700">
                  {'\u20B9'}{Number(billModal.paid_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Audit note */}
              <div className="audit bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <strong>E3 Audit Log:</strong> This transaction has been recorded in the append-only audit log. Order-receipt-invoice matching verified. No modifications permitted (TC-E3-03, TC-E3-05).
              </div>

              <div className="footer text-center text-[11px] text-slate-400 pt-3 border-t border-slate-100">
                <p>FRESHCART Grocery Compare | Centralized Procurement System</p>
                <p>Team 10 Mini Project | Guide: Mrs. Indira Bidari</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPayments;