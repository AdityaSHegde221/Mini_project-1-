import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { PieChart as PieIcon, BarChart3, DollarSign, ShieldCheck } from 'lucide-react';

export const FinanceReports = () => {
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await api.get('/finance/reports');
        setReports(res.data);
      } catch (err) {
        console.error('Failed to load finance reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const COLORS = ['#10b981', '#f43f5e', '#3b82f6', '#f59e0b', '#8b5cf6'];

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Computing financial analytics from PostgreSQL...</div>;
  }

  const recStats = reports?.reconciliationStats || { matched_count: 0, mismatch_count: 0 };
  const recPieData = [
    { name: 'Matched 100%', value: Number(recStats.matched_count || 0) },
    { name: 'Discrepancy / Blocked', value: Number(recStats.mismatch_count || 0) }
  ];

  const vendorSpendData = (reports?.spendByVendor || []).map(v => ({
    vendor: v.vendor_name,
    amount: Number(v.total_amount)
  }));

  const categorySpendData = (reports?.spendByCategory || []).map(c => ({
    category: c.category,
    amount: Number(c.total_spend)
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Intelligence & Disbursal Reports</h1>
        <p className="text-xs text-slate-500">Real-time expenditure and audit reconciliation statistics</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reconciliation Success vs Discrepancy Rate */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <PieIcon className="w-5 h-5 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">3-Way Reconciliation Match Rate</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">Percentage of audited orders matching PO, GRN, and Invoice</p>
          </div>

          <div className="h-64 w-full">
            {recPieData[0].value === 0 && recPieData[1].value === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No reconciliations completed yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={recPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f43f5e" />
                  </Pie>
                  <Tooltip
                    formatter={(val) => [`${val} audits`, 'Volume']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Spend by Beneficiary Vendor */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <BarChart3 className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">Settled Spend by Supplier</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">Disbursed payments across verified vendors (₹)</p>
          </div>

          <div className="h-64 w-full">
            {vendorSpendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No settled vendor payments yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vendorSpendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="vendor" tick={{ fontSize: 10, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Disbursed']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#0d9488" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceReports;
