import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { CreditCard, CheckCircle2, AlertCircle, X, ShieldCheck, DollarSign } from 'lucide-react';

export const PaymentRecords = () => {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [approvedRecs, setApprovedRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeModalRec, setActiveModalRec] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Corporate NEFT / RTGS Transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchPaymentsData = async () => {
    try {
      const [payRes, recRes] = await Promise.all([
        api.get('/finance/payments'),
        api.get('/finance/reconciliations')
      ]);
      setPayments(payRes.data.payments);
      // Filter reconciliations that are approved/matched and do not yet have a payment
      const unbilled = recRes.data.reconciliations.filter(
        r => r.is_matched && r.status === 'Approved' && !r.payment_number
      );
      setApprovedRecs(unbilled);

      // Check query param for recId
      const targetRecId = searchParams.get('recId');
      if (targetRecId) {
        const found = recRes.data.reconciliations.find(r => String(r.id) === String(targetRecId));
        if (found && found.is_matched) {
          handleOpenPaymentModal(found);
        }
      }
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaymentsData();
  }, []);

  const handleOpenPaymentModal = (rec) => {
    setActiveModalRec(rec);
    setReferenceNumber(`RTGS-SBIN-${Date.now().toString().slice(-8)}`);
    setPaymentMethod('Corporate NEFT / RTGS Transfer');
    setFeedback(null);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await api.post('/finance/payments', {
        reconciliationId: activeModalRec.id,
        paymentMethod,
        referenceNumber
      });

      const p = res.data.payment;
      setFeedback({
        type: 'success',
        message: `Payment ${p.payment_number} successfully recorded for ₹${Number(p.amount).toLocaleString('en-IN')}! Procurement workflow is now officially Completed in PostgreSQL. Customer, Shopkeeper, and Vendor have received real-time confirmation notifications.`
      });
      setActiveModalRec(null);
      fetchPaymentsData();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Payment recording failed.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Disbursements & Settlement</h1>
          <p className="text-xs text-slate-500">Record final bank settlements for approved three-way reconciliations</p>
        </div>
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

      {/* Reconciliations Ready for Payment */}
      {approvedRecs.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl p-6 border border-emerald-200 shadow-sm">
          <div className="flex items-center space-x-2.5 mb-3 text-emerald-900">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold">Approved Reconciliations Ready for Disbursal ({approvedRecs.length})</h2>
          </div>
          <p className="text-xs text-emerald-800 mb-4">
            These orders have passed automated 3-way matching and are pre-authorized for immediate financial disbursement.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedRecs.map((rec) => (
              <div key={rec.id} className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold text-navy-900 block">{rec.po_number}</span>
                  <p className="font-semibold text-slate-800 text-xs mt-1">{rec.product_name}</p>
                  <p className="text-[11px] text-slate-400">Supplier: {rec.vendor_name}</p>
                  <p className="font-mono text-base font-extrabold text-emerald-700 mt-2">
                    ₹{Number(rec.invoice_amount).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenPaymentModal(rec)}
                  className="mt-4 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center space-x-1"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disbursed Payments Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Completed Payment Disbursals</h2>
          <p className="text-xs text-slate-500 mt-0.5">Authoritative financial payment records from PostgreSQL</p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading payment transactions...</div>
          ) : payments.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              No payments recorded yet. Execute 3-way reconciliation first to disburse funds.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Payment Voucher</th>
                  <th className="px-6 py-4">PO & Invoice</th>
                  <th className="px-6 py-4">Beneficiary Vendor</th>
                  <th className="px-6 py-4">Amount Disbursed</th>
                  <th className="px-6 py-4">Payment Method</th>
                  <th className="px-6 py-4">Bank Ref / Transaction ID</th>
                  <th className="px-6 py-4">Settlement Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{p.payment_number}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-800 block">{p.po_number}</span>
                      <span className="text-[11px] text-slate-400">{p.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{p.vendor_name}</td>
                    <td className="px-6 py-4 font-mono font-extrabold text-emerald-700 text-sm">
                      ₹{Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{p.payment_method}</td>
                    <td className="px-6 py-4 font-mono text-slate-700 text-[11px]">{p.reference_number}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={p.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {activeModalRec && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Reconciled Voucher</span>
                <h3 className="text-lg font-bold text-slate-900">Authorize Payment Settlement</h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">PO: {activeModalRec.po_number}</p>
              </div>
              <button onClick={() => setActiveModalRec(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs mb-4">
              <p><strong>Supplier:</strong> {activeModalRec.vendor_name}</p>
              <p className="mt-0.5"><strong>Product:</strong> {activeModalRec.product_name}</p>
              <p className="mt-1 font-bold text-emerald-800 text-sm">
                Approved Disbursement: ₹{Number(activeModalRec.invoice_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-purple-600"
                >
                  <option value="Corporate NEFT / RTGS Transfer">Corporate NEFT / RTGS Transfer</option>
                  <option value="Direct Treasury Account Transfer">Direct Treasury Account Transfer</option>
                  <option value="Commercial Letter of Credit">Commercial Letter of Credit</option>
                  <option value="Corporate Escrow Clearing">Corporate Escrow Clearing</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Bank Reference Number / Transaction UTR
                </label>
                <input
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g. RTGS-SBIN-20261114-99881"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-navy-900 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-purple-900 text-[11px] leading-relaxed">
                <strong>Completion Effect:</strong> Committing payment will update the originating Purchase Request to <strong>Completed</strong> and dispatch notifications to Customer, Shopkeeper, and Vendor.
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModalRec(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-xl text-white transition shadow flex items-center space-x-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{submitting ? 'Disbursing...' : 'Confirm Payment & Complete'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentRecords;
