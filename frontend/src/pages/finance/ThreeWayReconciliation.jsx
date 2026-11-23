import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import {
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet,
  PackageCheck,
  Receipt,
  CreditCard,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const ThreeWayReconciliation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [selectedPoId, setSelectedPoId] = useState(searchParams.get('poId') || '');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [recResult, setRecResult] = useState(null);
  const [pastReconciliations, setPastReconciliations] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrdersAndHistory = async () => {
      try {
        const [ordRes, recRes] = await Promise.all([
          api.get('/finance/purchase-orders'),
          api.get('/finance/reconciliations')
        ]);
        setOrders(ordRes.data.orders);
        setPastReconciliations(recRes.data.reconciliations);

        const initialPoId = searchParams.get('poId') || (ordRes.data.orders.length > 0 ? ordRes.data.orders[0].id : '');
        if (initialPoId) {
          setSelectedPoId(initialPoId);
          fetchPreview(initialPoId);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load purchase orders and reconciliation history.');
      }
    };
    fetchOrdersAndHistory();
  }, []);

  const fetchPreview = async (poId) => {
    if (!poId) return;
    setLoading(true);
    setRecResult(null);
    setError('');
    try {
      const res = await api.get(`/finance/reconciliation/preview/${poId}`);
      setPreview(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the PO, GRN, and invoice preview.');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPo = (id) => {
    setSelectedPoId(id);
    fetchPreview(id);
  };

  const handleExecuteReconciliation = async () => {
    if (!preview?.goodsReceipt || !preview?.invoice) {
      return;
    }

    setReconciling(true);
    setError('');
    try {
      const res = await api.post('/finance/reconciliation', {
        poId: preview.purchaseOrder.id,
        grnId: preview.goodsReceipt.id,
        invoiceId: preview.invoice.id
      });
      setRecResult(res.data);
      // Refresh past reconciliations
      const recHistory = await api.get('/finance/reconciliations');
      setPastReconciliations(recHistory.data.reconciliations);
    } catch (err) {
      setError(err.response?.data?.message || 'Finance could not complete the three-way review.');
    } finally {
      setReconciling(false);
    }
  };

  const po = preview?.purchaseOrder;
  const grn = preview?.goodsReceipt;
  const inv = preview?.invoice;

  return (
    <div className="space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 block">ENGINE 3 AUDIT INTERFACE</span>
        <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Three-Way Reconciliation (PO vs GRN vs Invoice)</h1>
        <p className="text-xs text-slate-500">
          Shopkeeper creates the PO, Vendor dispatches and submits the invoice, Shopkeeper records actual receipt as the GRN, then Finance reviews all three records before payment.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</p>}

      {/* Selector Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="w-full sm:w-96">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Select Purchase Order to Audit
          </label>
          <select
            value={selectedPoId}
            onChange={(e) => handleSelectPo(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-navy-900 focus:border-purple-600 focus:outline-none"
          >
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.po_number} - {o.product_name} (₹{Number(o.total_amount).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <button
            onClick={handleExecuteReconciliation}
            disabled={!grn || !inv || reconciling}
            className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
          >
            <Scale className="w-4 h-4" />
            <span>{reconciling ? 'Reviewing documents...' : 'Review PO, GRN & vendor invoice'}</span>
          </button>
        </div>
      </div>

      {/* Missing prerequisite warnings */}
      {preview && (!grn || !inv) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div>
            <strong>Incomplete Records for Reconciliation:</strong>
            {!grn && <span> The shopkeeper has not yet confirmed the delivered quantity and recorded the GRN.</span>}
            {!inv && <span> The vendor has not yet dispatched the order and submitted the digital invoice.</span>}
            <span> Both records must be present in PostgreSQL before three-way matching can execute.</span>
          </div>
        </div>
      )}

      {/* Real-time Reconciliation Result Banner */}
      {recResult && (
        <div
          className={`p-6 rounded-3xl border shadow-md animate-in fade-in zoom-in-95 ${
            recResult.isMatched
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
              : 'bg-rose-50 border-rose-300 text-rose-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${recResult.isMatched ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
                {recResult.isMatched ? <CheckCircle2 className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest block">
                  {recResult.isMatched ? 'THREE-WAY MATCH PASSED' : 'MISMATCH • PAYMENT ON HOLD'}
                </span>
                <h3 className="text-lg font-bold">
                  {recResult.isMatched
                    ? '3-Way Match Succeeded (100% Record Alignment)'
                    : 'Discrepancy Detected Between PO, GRN, and Invoice'}
                </h3>
                <p className="text-xs opacity-90 mt-1">{recResult.message}</p>
                {recResult.discrepancies?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs font-semibold text-rose-800">
                    {recResult.discrepancies.map((d, i) => (
                      <li key={i}>• {d}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {recResult.isMatched ? (
              <Link
                to={`/finance/payments?recId=${recResult.reconciliation.id}`}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5 flex-shrink-0"
              >
                <CreditCard className="w-4 h-4" />
                <span>Approve matched invoice & record payment</span>
              </Link>
            ) : (
              <div className="px-4 py-2 bg-rose-200/80 text-rose-900 font-bold text-xs rounded-xl border border-rose-300 flex-shrink-0">
                Reject / Hold · Payment blocked until the discrepancy is resolved
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3-WAY COMPARISON CARDS (Section 4.E Requirement) */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">Loading records from PostgreSQL...</div>
      ) : po ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Purchase Order */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">1. Purchase Order</h3>
                </div>
                <span className="font-mono text-xs font-bold text-indigo-700">{po.po_number}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Contracted Product</span>
                  <span className="font-bold text-slate-800">{po.product_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Vendor / Supplier</span>
                  <span className="font-bold text-slate-800">{po.vendor_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Ordered Quantity</span>
                  <span className="font-mono text-sm font-bold text-navy-900">{po.quantity} units</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">Contract Unit Price</span>
                  <span className="font-mono font-bold text-slate-800">₹{Number(po.unit_price).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block uppercase text-[10px]">PO Total Amount</span>
                  <span className="font-mono text-base font-extrabold text-indigo-700">₹{Number(po.total_amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
              Source: Shopkeeper PO Commitment
            </div>
          </div>

          {/* Card 2: Goods Receipt (GRN) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <PackageCheck className="w-5 h-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">2. Goods Receipt (GRN)</h3>
                </div>
                {grn && <span className="font-mono text-xs font-bold text-amber-700">{grn.grn_number}</span>}
              </div>

              {grn ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Physically Received Qty</span>
                    <span className={`font-mono text-sm font-bold ${Number(grn.received_quantity) === Number(po.quantity) ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {grn.received_quantity} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Damaged Items</span>
                    <span className={`font-mono font-bold ${Number(grn.damaged_quantity) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {grn.damaged_quantity} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Missing Items</span>
                    <span className={`font-mono font-bold ${Number(grn.missing_quantity) > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                      {grn.missing_quantity} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Receipt Condition Status</span>
                    <Badge status={grn.status} />
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Inspection Remarks</span>
                    <span className="text-slate-600 italic">{grn.remarks || 'Standard verified receipt'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Awaiting shopkeeper delivery confirmation.
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
            Source: {grn?.received_by_role || 'Shopkeeper'} receipt confirmation
            </div>
          </div>

          {/* Card 3: Vendor Invoice */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">3. Vendor Invoice</h3>
                </div>
                {inv && <span className="font-mono text-xs font-bold text-teal-700">{inv.invoice_number}</span>}
              </div>

              {inv ? (
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Billed Quantity</span>
                    <span className={`font-mono text-sm font-bold ${Number(inv.quantity) === Number(po.quantity) ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {inv.quantity} units
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Invoiced Unit Price</span>
                    <span className={`font-mono font-bold ${Number(inv.unit_price) === Number(po.unit_price) ? 'text-slate-800' : 'text-rose-600'}`}>
                      ₹{Number(inv.unit_price).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Invoiced Total Amount</span>
                    <span className={`font-mono text-base font-extrabold ${Math.abs(Number(inv.total_amount) - Number(po.total_amount)) < 0.01 ? 'text-teal-700' : 'text-rose-600'}`}>
                      ₹{Number(inv.total_amount).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Invoice Date</span>
                    <span className="text-slate-700">{new Date(inv.invoice_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block uppercase text-[10px]">Invoice Status</span>
                    <Badge status={inv.status} />
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Awaiting vendor invoice submission.
                </div>
              )}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 font-medium">
              Source: Vendor Supplier Billing
            </div>
          </div>
        </div>
      ) : null}

      {/* Reconciliation Audit Trail */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Reconciliation Audit Trail (PostgreSQL History)</h2>
          <p className="text-xs text-slate-500 mt-0.5">Immutable audit logs of all 3-way matching evaluations</p>
        </div>

        <div className="overflow-x-auto">
          {pastReconciliations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No reconciliation logs found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Audit ID</th>
                  <th className="px-6 py-4">Linked Records</th>
                  <th className="px-6 py-4">Amounts (PO vs Inv)</th>
                  <th className="px-6 py-4">Quantities (PO vs GRN vs Inv)</th>
                  <th className="px-6 py-4">Reconciled By</th>
                  <th className="px-6 py-4">Match Status</th>
                  <th className="px-6 py-4 text-right">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {pastReconciliations.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{rec.rec_number}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-800 font-bold block">{rec.po_number}</span>
                      <span className="text-[11px] text-slate-400">{rec.grn_number} • {rec.invoice_number}</span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span>₹{Number(rec.po_amount).toFixed(2)}</span> vs{' '}
                      <span className="font-bold">₹{Number(rec.invoice_amount).toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      <span>{rec.po_quantity}</span> (PO) /{' '}
                      <span>{rec.grn_quantity}</span> (GRN) /{' '}
                      <span>{rec.invoice_quantity}</span> (Inv)
                    </td>
                    <td className="px-6 py-4 text-slate-600">{rec.finance_officer_name}</td>
                    <td className="px-6 py-4">
                      <Badge status={rec.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {rec.payment_number ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {rec.payment_number}
                        </span>
                      ) : rec.is_matched ? (
                        <Link
                          to={`/finance/payments?recId=${rec.id}`}
                          className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 rounded-lg font-bold"
                        >
                          Disburse
                        </Link>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px]">Blocked</span>
                      )}
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

export default ThreeWayReconciliation;
