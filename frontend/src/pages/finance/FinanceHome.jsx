import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import { Scale, CreditCard, Receipt, FileSpreadsheet, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

export const FinanceHome = () => {
  const { user, profile } = useAuth();
  const [orders, setOrders] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinanceData = async () => {
      try {
        const [ordRes, recRes, repRes] = await Promise.all([
          api.get('/finance/purchase-orders'),
          api.get('/finance/reconciliations'),
          api.get('/finance/reports')
        ]);
        setOrders(ordRes.data.orders);
        setReconciliations(recRes.data.reconciliations);
        setReports(repRes.data);
      } catch (err) {
        console.error('Failed to load finance data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFinanceData();
  }, []);

  const totalPaid = reports?.totalPaid || 0;
  const pendingInvoices = reports?.pendingInvoicesCount || 0;
  const matchedRecs = reports?.reconciliationStats?.matched_count || 0;
  const mismatchRecs = reports?.reconciliationStats?.mismatch_count || 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-navy-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-purple-900/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Financial Audit & Disbursal Hub</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Finance Controller: {user?.full_name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Officer Code: {profile?.employee_code || 'FIN-001'} • Execute 3-way reconciliation (PO vs GRN vs Invoice) and authorize transactional payment disbursements.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/finance/reconciliation"
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-2"
          >
            <Scale className="w-4 h-4" />
            <span>3-Way Reconciliation</span>
          </Link>
          <Link
            to="/finance/payments"
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs transition flex items-center space-x-2"
          >
            <CreditCard className="w-4 h-4 text-purple-400" />
            <span>Record Payment</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Total Disbursed Spend"
          value={`₹${Number(totalPaid).toLocaleString('en-IN')}`}
          subtitle="100% reconciled & settled"
          icon={CreditCard}
          color="emerald"
        />
        <StatCard
          title="Invoices To Reconcile"
          value={pendingInvoices}
          subtitle="Submitted by suppliers"
          icon={Receipt}
          color={pendingInvoices > 0 ? "amber" : "navy"}
        />
        <StatCard
          title="Successful 3-Way Matches"
          value={matchedRecs}
          subtitle="Approved for payment"
          icon={ShieldCheck}
          color="teal"
        />
        <StatCard
          title="Blocked Discrepancies"
          value={mismatchRecs}
          subtitle="Payment blocked by Engine 3"
          icon={AlertTriangle}
          color={mismatchRecs > 0 ? "rose" : "navy"}
        />
      </div>

      {/* Pending Reconciliations Queue */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Purchase Orders Ready for Audit & Reconciliation</h2>
            <p className="text-xs text-slate-500 mt-0.5">Orders with logged receipts and vendor invoices</p>
          </div>
          <Link
            to="/finance/reconciliation"
            className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center"
          >
            Open 3-Way Matcher <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading audit queue...</div>
          ) : orders.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">No orders in database.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3.5">PO Number</th>
                  <th className="px-6 py-3.5">Product & Vendor</th>
                  <th className="px-6 py-3.5">PO Amount</th>
                  <th className="px-6 py-3.5">Goods Receipt (GRN)</th>
                  <th className="px-6 py-3.5">Vendor Invoice</th>
                  <th className="px-6 py-3.5">Audit Match Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {orders.slice(0, 6).map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{po.po_number}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{po.product_name}</p>
                      <p className="text-[11px] text-slate-400">{po.vendor_name}</p>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-navy-900 text-sm">
                      ₹{Number(po.total_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4">
                      {po.grn_number ? (
                        <span className="font-mono text-teal-700 font-semibold">{po.grn_number}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not Received</span>
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
                      {po.reconciliation_status ? (
                        <Badge status={po.reconciliation_status} />
                      ) : po.grn_id && po.invoice_id ? (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Ready for Matching
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Pending Records</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {po.grn_id && po.invoice_id ? (
                        <Link
                          to={`/finance/reconciliation?poId=${po.id}`}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition shadow-sm inline-flex items-center space-x-1"
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>Reconcile</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Awaiting GRN/Inv</span>
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

export default FinanceHome;
