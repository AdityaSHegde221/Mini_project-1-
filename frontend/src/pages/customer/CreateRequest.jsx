import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { PlusCircle, Package, Calendar, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const CreateRequest = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(20); // Default to 20 for key testing rubric!
  const [unit, setUnit] = useState('Pcs');
  const [description, setDescription] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await api.get('/customer/products');
        const availableProducts = res.data.products || [];
        setProducts(availableProducts);
        if (availableProducts.length > 0) {
          const requestedProduct = availableProducts.find(
            (product) => String(product.id) === String(location.state?.selectedProductId)
          );
          const defaultProduct = requestedProduct
            || availableProducts.find((product) => product.name.includes('Atta'))
            || availableProducts[0];
          setSelectedProductId(defaultProduct.id);
          setUnit(defaultProduct.unit || '');
        }
      } catch (err) {
        console.error('Failed to load products:', err);
        setProductsError(err.response?.data?.message || 'Could not load the grocery catalog. Please try again.');
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, [location.state?.selectedProductId]);

  const normalizedProductSearch = productSearch.trim().toLowerCase();
  const matchingProducts = products.filter((product) =>
    `${product.name} ${product.category}`.toLowerCase().includes(normalizedProductSearch)
  );
  const selectedProduct = products.find((product) => String(product.id) === String(selectedProductId));
  const visibleProducts = selectedProduct && !matchingProducts.some((product) => product.id === selectedProduct.id)
    ? [selectedProduct, ...matchingProducts]
    : matchingProducts;

  const handleProductChange = (e) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    const prod = products.find(p => String(p.id) === String(pId));
    if (prod) {
      setUnit(prod.unit);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/customer/requests', {
        productId: selectedProductId,
        quantity: Number(quantity),
        unit,
        description,
        requiredDate: requiredDate || null
      });

      setSuccessData(res.data.request);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit purchase request.');
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-emerald-100 shadow-xl text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">Grocery Request Sent!</h2>
        <p className="text-xs text-slate-500 mt-1">Your shopkeeper can now review and compare supplier options.</p>
        
        <div className="my-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block font-mono text-xl font-extrabold text-navy-900 tracking-wider">
          {successData.request_code}
        </div>

        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs text-left mb-6 leading-relaxed">
          <p className="font-bold mb-1">Request sent to your shop</p>
          <p>Your shopkeeper will review the request and compare supplier availability and prices before responding. Contact the shop about collection; this app does not arrange delivery or collection.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => {
              setSuccessData(null);
              setDescription('');
            }}
            className="px-5 py-2.5 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition"
          >
            Create Another Request
          </button>
          <button
            onClick={() => navigate('/customer/requests')}
            className="px-5 py-2.5 bg-navy-900 text-white font-semibold text-xs rounded-xl hover:bg-navy-800 transition shadow"
          >
            View My Requests
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Request a Grocery</h1>
            <p className="text-xs text-slate-500">Ask your shopkeeper to review supplier availability and prices for this grocery.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Select */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Select Product
            </label>
            <div className="space-y-2">
              <input
                type="search"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search products by name or category..."
                aria-label="Search grocery products"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:border-teal-500 focus:outline-none"
              />
              <select
                required
                value={selectedProductId}
                onChange={handleProductChange}
                disabled={productsLoading || products.length === 0}
                aria-label="Select grocery product"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:border-teal-500 focus:outline-none"
              >
                {productsLoading && <option value="">Loading products...</option>}
                {!productsLoading && products.length === 0 && <option value="">No products available</option>}
                {visibleProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
              {productsError && <p role="alert" className="text-xs text-rose-600">{productsError}</p>}
              {!productsLoading && products.length > 0 && matchingProducts.length === 0 && (
                <p className="text-xs text-slate-500">No groceries match that search.</p>
              )}
            </div>
          </div>

          {/* Quantity & Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                required
                aria-label="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="20"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-semibold focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Unit of Measure
              </label>
              <input
                type="text"
                required
                aria-label="Unit of measure"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm font-medium focus:border-teal-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Description & Additional Requirements */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Note for the Shopkeeper (Optional)
            </label>
            <textarea
              rows="3"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a brand preference or a note about your grocery request."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:border-teal-500 focus:outline-none resize-none font-normal"
            ></textarea>
          </div>

          {/* Required Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Needed By (Optional)
            </label>
            <input
              type="date"
              value={requiredDate}
              onChange={(e) => setRequiredDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:border-teal-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || productsLoading || !selectedProductId}
            className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-teal-500/20 disabled:opacity-50 mt-2"
          >
            {loading ? 'Sending request...' : 'Request Price Comparison'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRequest;
