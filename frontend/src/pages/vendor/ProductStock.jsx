import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Package, Edit3, CheckCircle2, AlertCircle, Save, X } from 'lucide-react';

export const ProductStock = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockVal, setStockVal] = useState(0);
  const [priceVal, setPriceVal] = useState(0);
  const [leadTime, setLeadTime] = useState(2);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/vendor/products');
      setProducts(res.data.products);
    } catch (err) {
      console.error('Failed to load vendor products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenEdit = (p) => {
    setEditingProduct(p);
    setStockVal(p.available_stock || 0);
    setPriceVal(p.unit_price || 0);
    setLeadTime(p.lead_time_days || 2);
    setFeedback(null);
  };

  const handleSaveStock = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await api.post('/vendor/stock', {
        productId: editingProduct.product_id,
        availableStock: Number(stockVal),
        unitPrice: Number(priceVal),
        leadTimeDays: Number(leadTime)
      });

      setFeedback({
        type: 'success',
        message: `Inventory updated for ${editingProduct.product_name} in PostgreSQL!`
      });
      setEditingProduct(null);
      fetchProducts();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update stock.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory & Price Management</h1>
          <p className="text-xs text-slate-500">
            Set real-time available stock and unit pricing for the Centralized Procurement System
          </p>
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
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="font-bold underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Products & Stock Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading products...</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Current Available Stock</th>
                  <th className="px-6 py-4">Your Unit Price</th>
                  <th className="px-6 py-4">Lead Time</th>
                  <th className="px-6 py-4">Last Updated</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {products.map((p) => (
                  <tr key={p.product_id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{p.product_name}</p>
                      <p className="text-[11px] text-slate-400">{p.description}</p>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">{p.category}</td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-sm font-bold ${Number(p.available_stock) > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {p.available_stock} {p.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">
                      {Number(p.unit_price) > 0 ? `₹${Number(p.unit_price).toFixed(2)}` : 'Not Set'}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.lead_time_days ? `${p.lead_time_days} days` : '2 days'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {p.stock_updated_at ? new Date(p.stock_updated_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-teal-600 hover:text-white rounded-lg text-slate-700 font-semibold transition inline-flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Update Stock & Price</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Stock & Pricing</h3>
                <p className="text-xs text-slate-500">{editingProduct.product_name}</p>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Available Stock Quantity ({editingProduct.unit})
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stockVal}
                  onChange={(e) => setStockVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Unit Price (₹ INR)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={priceVal}
                  onChange={(e) => setPriceVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Lead Time (Business Days)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={leadTime}
                  onChange={(e) => setLeadTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:border-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 font-bold rounded-xl text-white transition shadow flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  <span>{saving ? 'Saving...' : 'Save to PostgreSQL'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductStock;
