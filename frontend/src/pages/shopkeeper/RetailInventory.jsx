import React, { useEffect, useState } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Package, Pencil, Plus, Store, Trash2, X } from 'lucide-react';
import api from '../../services/api';

const defaultExpiryDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 6);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const RetailInventory = () => {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [createError, setCreateError] = useState('');
  const [stock, setStock] = useState('');
  const [price, setPrice] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiryDate);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const fetchProducts = async () => {
    setError('');
    try {
      const response = await api.get('/shopkeeper/inventory');
      setProducts(response.data.products || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your store listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openEditor = (product) => {
    setEditingProduct(product);
    setStock(product.available_stock ?? 1);
    setPrice(product.unit_price ?? '');
    setExpiryDate(product.expiry_date?.slice(0, 10) || defaultExpiryDate());
    setFeedback('');
  };

  const saveListing = async (event) => {
    event.preventDefault();
    if (!editingProduct) return;

    setSaving(true);
    setFeedback('');
    try {
      await api.put(`/shopkeeper/inventory/${editingProduct.product_id}`, {
        availableStock: Number(stock),
        unitPrice: Number(price),
        expiryDate
      });
      setEditingProduct(null);
      setFeedback(`${editingProduct.product_name} listing saved.`);
      await fetchProducts();
    } catch (err) {
      setFeedback(err.response?.data?.message || 'Could not save this listing.');
    } finally {
      setSaving(false);
    }
  };

  const createProduct = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const productName = formData.get('name');

    setSaving(true);
    setCreateError('');
    setFeedback('');
    try {
      await api.post('/shopkeeper/products', {
        name: productName,
        category: formData.get('category'),
        unit: formData.get('unit'),
        description: formData.get('description'),
        availableStock: Number(formData.get('availableStock')),
        unitPrice: Number(formData.get('unitPrice')),
        expiryDate: formData.get('expiryDate')
      });
      setShowCreateProduct(false);
      setFeedback(`${productName} was added to the catalog and your shop.`);
      await fetchProducts();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Could not add this product.');
    } finally {
      setSaving(false);
    }
  };

  const removeListing = async (product) => {
    if (!window.confirm(`Remove ${product.product_name} from your shop?`)) return;

    setDeletingProductId(product.product_id);
    setFeedback('');
    try {
      await api.delete(`/shopkeeper/inventory/${product.product_id}`);
      setFeedback(`${product.product_name} was removed from your shop.`);
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove this shop listing.');
    } finally {
      setDeletingProductId(null);
    }
  };

  const listedProducts = products.filter((product) => product.available_stock !== null);
  const unlistedProducts = products.filter((product) => product.available_stock === null);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Your grocery store</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900">My products</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create products for your shop or add existing catalog products. You can only edit or remove your own shop listings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCatalog(true)}
            disabled={unlistedProducts.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Package className="h-4 w-4" /> Add from catalog
          </button>
          <button
            type="button"
            onClick={() => {
              setCreateError('');
              setShowCreateProduct(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" /> Create product
          </button>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <Store className="mt-0.5 h-5 w-5 shrink-0" />
        <p className="text-xs leading-5">Set your fixed shop coordinates in <strong>Store Profile</strong> so customers can calculate distance to your shop.</p>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {feedback && (
        <div role="status" className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {feedback}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading your products...</div>
      ) : listedProducts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Package className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">You have no shop listings yet</p>
          <p className="mt-1 text-xs text-slate-500">Create a product or add one from the catalog to show it to customers.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {listedProducts.map((product) => (
            <article key={product.product_id} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Package className="h-5 w-5" />
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${product.available_stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                  {product.available_stock > 0 ? 'In stock' : 'Out of stock'}
                </span>
              </div>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">{product.category}</p>
              <h2 className="mt-1 font-extrabold text-slate-900">{product.product_name}</h2>
              <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-slate-500">{product.description}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Your price</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">
                    {product.unit_price ? `₹${Number(product.unit_price).toFixed(2)}` : 'Not set'}
                    <span className="ml-1 text-[10px] font-semibold text-slate-500">/ {product.unit}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">In stock</p>
                  <p className="mt-1 text-sm font-extrabold text-slate-900">{product.available_stock ?? 0} {product.unit}</p>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-slate-600">
                    Expires: <strong>{product.expiry_date ? new Date(`${product.expiry_date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN') : 'Not set'}</strong>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => openEditor(product)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-3 text-xs font-bold text-white transition hover:bg-emerald-700"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => removeListing(product)}
                  disabled={deletingProductId === product.product_id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 py-3 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {deletingProductId === product.product_id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {showCatalog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="font-black text-slate-900">Add a product to your shop</h2>
                <p className="mt-1 text-xs text-slate-500">Choose from the shared grocery catalog.</p>
              </div>
              <button type="button" onClick={() => setShowCatalog(false)} aria-label="Close catalog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[65vh] space-y-2 overflow-y-auto p-5">
              {unlistedProducts.map((product) => (
                <div key={product.product_id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{product.product_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{product.category} · {product.unit}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCatalog(false);
                      openEditor(product);
                    }}
                    className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCreateProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Create a product</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">It will be added to the shared catalog and listed in your shop.</p>
              </div>
              <button type="button" onClick={() => setShowCreateProduct(false)} aria-label="Close create product form" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={createProduct} className="space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Product name
                <input name="name" required maxLength={255} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Category
                <input name="category" required maxLength={100} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Unit
                <input name="unit" required maxLength={50} placeholder="e.g. 1 kg" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <label className="block text-xs font-bold text-slate-700">
                Description
                <textarea name="description" rows="2" maxLength={2000} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-700">
                  Available quantity
                  <input name="availableStock" type="number" min="0" step="1" defaultValue="1" required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Price (₹)
                  <input name="unitPrice" type="number" min="0.01" step="0.01" required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-700">
                Expiry date
                <input name="expiryDate" type="date" defaultValue={defaultExpiryDate()} required className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
              </label>
              {createError && <p role="alert" className="text-xs font-medium text-rose-700">{createError}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowCreateProduct(false)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? 'Adding...' : 'Create and list'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5">
              <h2 className="text-lg font-black text-slate-900">Shop listing</h2>
              <p className="mt-1 text-sm text-slate-500">{editingProduct.product_name}</p>
            </div>
            <form onSubmit={saveListing} className="space-y-4">
              <label className="block text-xs font-bold text-slate-600">
                Available quantity ({editingProduct.unit})
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={stock}
                  onChange={(event) => setStock(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Price per {editingProduct.unit} (₹)
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Expiry date
                <input
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(event) => setExpiryDate(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500"
                />
              </label>
              {feedback && <p role="alert" className="flex items-center gap-2 text-xs text-rose-700"><AlertCircle className="h-4 w-4" /> {feedback}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setEditingProduct(null)} className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save listing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetailInventory;
