import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Boxes, PackageCheck, AlertTriangle } from 'lucide-react';

export const ReceivedInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await api.get('/warehouse/inventory');
        setInventory(res.data.inventory);
      } catch (err) {
        console.error('Failed to load warehouse inventory:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInventory();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Warehouse Physical Stock Inventory</h1>
        <p className="text-xs text-slate-500">Cumulative verified inventory received across all GRNs</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading physical inventory...</div>
          ) : inventory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              No inventory recorded in warehouse yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Total Physical Units Received</th>
                  <th className="px-6 py-4">Damaged Units Reported</th>
                  <th className="px-6 py-4">Missing Units Reported</th>
                  <th className="px-6 py-4">Receipt Notes Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {inventory.map((item) => (
                  <tr key={item.product_id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-bold text-slate-800 text-sm">{item.product_name}</td>
                    <td className="px-6 py-4 text-slate-500">{item.category}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm font-bold text-emerald-700">
                        {item.total_received} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-bold ${Number(item.total_damaged) > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {item.total_damaged} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-bold ${Number(item.total_missing) > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {item.total_missing} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {item.total_receipts} GRN(s)
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

export default ReceivedInventory;
