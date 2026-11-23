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
import { BarChart3, PieChart as PieIcon, TrendingUp, Layers } from 'lucide-react';

export const ShopkeeperReports = () => {
  const [data, setData] = useState(null);
  const [financeData, setFinanceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const [repRes, finRes] = await Promise.all([
          api.get('/reports/overview'),
          api.get('/finance/reports').catch(() => ({ data: { spendByCategory: [] } }))
        ]);
        setData(repRes.data);
        setFinanceData(finRes.data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const COLORS = ['#14b8a6', '#437cb9', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6'];

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-xs">Loading analytics data from PostgreSQL...</div>;
  }

  const statusChartData = (data?.statusDistribution || []).map(s => ({
    name: s.status,
    value: Number(s.count)
  }));

  const categorySpendData = (financeData?.spendByCategory || []).map(c => ({
    category: c.category,
    amount: Number(c.total_spend)
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Procurement Reports & Visual Analytics</h1>
        <p className="text-xs text-slate-500">Live operational intelligence computed directly from centralized PostgreSQL tables</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Requisitions by Lifecycle Status (Pie Chart) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <PieIcon className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-bold text-slate-900">Requisitions by Status</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">Distribution across procurement lifecycle stages</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`${val} requests`, 'Volume']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Spend by Product Category (Bar Chart) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2.5 mb-2">
              <BarChart3 className="w-5 h-5 text-navy-800" />
              <h2 className="text-base font-bold text-slate-900">Procurement Spend by Category</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">Settled payment volume in Indian Rupees (₹)</p>
          </div>

          <div className="h-64 w-full">
            {categorySpendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No completed payments yet. As orders finish reconciliation & payment, spend will appear here.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySpendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    formatter={(val) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Spend']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" fill="#437cb9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopkeeperReports;
