import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  XCircle
} from 'lucide-react';

const VendorSearch = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(20);
  const [selectedRequestId, setSelectedRequestId] = useState(searchParams.get('reqId') || '');
  const [cart, setCart] = useState([]);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [enquiryVendor, setEnquiryVendor] = useState(null);
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [enquirySending, setEnquirySending] = useState(false);

  const runVendorSearch = async (items) => {
    if (!items.length) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await api.post('/shopkeeper/vendors/search-basket', {
        items: items.map(({ productId, quantity: requiredQuantity }) => ({
          productId: Number(productId),
          quantity: Number(requiredQuantity)
        }))
      });
      setEvaluation(response.data);
      setSelectedVendorId(response.data.recommendedVendorId || null);
    } catch (error) {
      setEvaluation(null);
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Could not compare vendors for these products.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        const [productResponse, requestResponse] = await Promise.all([
          api.get('/shopkeeper/inventory'),
          api.get('/shopkeeper/requests?status=Approved')
        ]);
        const catalog = (productResponse.data.products || []).map((product) => ({
          ...product,
          id: product.product_id,
          name: product.product_name
        }));
        const requests = requestResponse.data.requests || [];
        setProducts(catalog);
        setApprovedRequests(requests);

        const requestId = searchParams.get('reqId');
        const selectedRequest = requests.find((request) => String(request.id) === requestId);
        const paramProductId = searchParams.get('productId');
        const initialProductId = selectedRequest?.product_id || paramProductId
          || catalog.find((product) => product.name.includes('Atta'))?.id
          || catalog[0]?.id;
        if (!initialProductId) return;

        const initialQuantity = selectedRequest?.quantity || Number(searchParams.get('qty')) || 20;
        const initialCart = [{
          productId: Number(initialProductId),
          quantity: Number(initialQuantity),
          requestId: selectedRequest?.id || null
        }];
        setSelectedProductId(String(initialProductId));
        setQuantity(Number(initialQuantity));
        setCart(initialCart);
        runVendorSearch(initialCart);
      } catch (error) {
        setFeedback({
          type: 'error',
          message: error.response?.data?.message || 'Could not load products and approved requests.'
        });
      }
    };
    initialize();
  }, [searchParams]);

  const handleSelectApprovedRequest = (requestId) => {
    setSelectedRequestId(requestId);
    const request = approvedRequests.find((item) => String(item.id) === String(requestId));
    if (request) {
      setSelectedProductId(String(request.product_id));
      setQuantity(Number(request.quantity));
    }
  };

  const addProduct = () => {
    const productId = Number(selectedProductId);
    const requestedQuantity = Number(quantity);
    if (!Number.isSafeInteger(productId) || !Number.isSafeInteger(requestedQuantity)
      || requestedQuantity < 1 || requestedQuantity > 100000) {
      setFeedback({ type: 'error', message: 'Choose a product and enter a whole-number quantity greater than zero.' });
      return;
    }
    const matchingRequest = approvedRequests.find((request) => (
      String(request.id) === String(selectedRequestId)
      && Number(request.product_id) === productId
      && Number(request.quantity) === requestedQuantity
    ));
    setCart((current) => {
      const existing = current.find((item) => Number(item.productId) === productId);
      if (existing) {
        return current.map((item) => item === existing
          ? { ...item, quantity: requestedQuantity, requestId: matchingRequest?.id || null }
          : item);
      }
      return [...current, {
        productId,
        quantity: requestedQuantity,
        requestId: matchingRequest?.id || null
      }];
    });
    setEvaluation(null);
    setFeedback(null);
  };

  const updateCartItem = (productId, nextQuantity) => {
    const requestedQuantity = Number(nextQuantity);
    if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > 100000) return;
    setCart((current) => current.map((item) => Number(item.productId) === Number(productId)
      ? { ...item, quantity: requestedQuantity, requestId: null }
      : item));
    setEvaluation(null);
  };

  const removeProduct = (productId) => {
    setCart((current) => current.filter((item) => Number(item.productId) !== Number(productId)));
    setEvaluation(null);
  };

  const handleManualSearch = (event) => {
    event.preventDefault();
    runVendorSearch(cart);
  };

  const handleSendEnquiry = async () => {
    if (!enquiryVendor || cart.length === 0) {
      setFeedback({ type: 'error', message: 'Choose a vendor and add at least one product to your restock list.' });
      return;
    }
    setEnquirySending(true);
    try {
      const response = await api.post('/shopkeeper/basket-enquiries', {
        vendorId: enquiryVendor.vendor_id,
        items: cart.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
          requestId: item.requestId || undefined
        })),
        notes: enquiryNotes
      });
      setFeedback({
        type: 'success',
        message: `Restock request sent to ${enquiryVendor.vendor_name}. Request ID: ${response.data.enquiry.enquiry_code}. Track it in Vendor Enquiries.`
      });
      setEnquiryVendor(null);
      setEnquiryNotes('');
      setEvaluation(null);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Could not send vendor enquiry.'
      });
    } finally {
      setEnquirySending(false);
    }
  };

  const getProductName = (productId) => products.find((product) => Number(product.id) === Number(productId))?.name || 'Product';

  return (
    <div className="space-y-6">
      <header>
        <span className="block text-xs font-bold uppercase tracking-wider text-teal-600">ENGINE 2 INTERFACE</span>
        <h1 className="mt-0.5 text-2xl font-bold text-slate-900">Vendor Selection & Decision Engine</h1>
        <p className="mt-1 text-xs text-slate-500">Compare one supplier against every product and quantity in your restock list. The order is never split across vendors.</p>
      </header>

      {feedback && (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border p-4 text-xs font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}

      <section className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
        <form onSubmit={handleManualSearch} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Approved request (optional)
            <select
              value={selectedRequestId}
              onChange={(event) => handleSelectApprovedRequest(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium"
            >
              <option value="">Select request to fill product and quantity</option>
              {approvedRequests.map((request) => (
                <option key={request.id} value={request.id}>
                  {request.request_code} - {request.product_name} ({request.quantity} {request.unit})
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Product
            <select
              value={selectedProductId}
              onChange={(event) => setSelectedProductId(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-medium"
            >
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Required quantity
            <input
              type="number"
              min="1"
              max="100000"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-800"
            />
          </label>

          <button
            type="button"
            onClick={addProduct}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-teal-800"
          >
            <Plus className="h-4 w-4" /> Add product
          </button>
        </form>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-extrabold text-slate-900">Restock list ({cart.length} products)</h2>
            <button type="button" onClick={() => runVendorSearch(cart)} disabled={loading || cart.length === 0} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50">
              <Search className="h-4 w-4" /> {loading ? 'Evaluating vendors...' : 'Find one vendor for all'}
            </button>
          </div>
          {cart.length === 0 ? (
            <p className="rounded-xl bg-white p-4 text-xs text-slate-500">Choose a product and quantity, then use Add product (+) to build your restock list.</p>
          ) : (
            <ul className="space-y-2">
              {cart.map((item) => {
                const product = products.find((entry) => Number(entry.id) === Number(item.productId));
                return (
                  <li key={item.productId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3">
                    <span className="min-w-40 flex-1 text-xs font-bold text-slate-800">{product?.name || getProductName(item.productId)}</span>
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                      Qty
                      <input type="number" min="1" step="1" value={item.quantity} onChange={(event) => updateCartItem(item.productId, event.target.value)} className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-800" />
                      {product?.unit}
                    </label>
                    {item.requestId && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Approved request linked</span>}
                    <button type="button" onClick={() => removeProduct(item.productId)} aria-label={`Remove ${product?.name || 'product'}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {evaluation && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
          <span>Engine execution: <strong className="text-teal-700">{evaluation.executionTimeMs}ms</strong></span>
          <span>One-vendor eligible: <strong>{evaluation.eligibleCount}</strong> of <strong>{evaluation.totalVendors}</strong></span>
          {evaluation.recommendedVendorId && <span className="font-bold text-emerald-700">Recommended: lowest total cost that fulfills every line</span>}
        </div>
      )}

      {evaluation && (
        <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">All Vendor Comparison</h2>
              <p className="mt-1 text-xs text-slate-500">A vendor is eligible only when it has enough stock for every product in your list.</p>
            </div>
            {!evaluation.hasEligibleVendor && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" /> No single vendor can fulfill this full restock
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">Checking stock for every requested product...</div>
          ) : evaluation.vendors.length === 0 ? (
            <div className="p-12 text-center text-xs font-medium text-slate-500">No active vendors are registered.</div>
          ) : (
            <div className="grid gap-4 p-4 lg:grid-cols-2">
              {evaluation.vendors.map((vendor) => (
                <article key={vendor.vendor_id} className={`rounded-2xl border p-4 ${vendor.is_recommended ? 'border-emerald-300 bg-emerald-50/40' : vendor.is_eligible ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50/70'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{vendor.vendor_name}</h3>
                        {vendor.is_recommended && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-extrabold text-emerald-800"><Sparkles className="h-3 w-3" /> BEST FIT</span>}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">{vendor.company_name || 'Wholesale supplier'} · Rating ★ {vendor.rating || '4.5'}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${vendor.is_eligible ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}`}>
                      {vendor.is_eligible ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {vendor.is_eligible ? 'Can fulfill all products' : 'Cannot fulfill full list'}
                    </span>
                  </div>

                  <ul className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                    {vendor.item_results.map((item) => (
                      <li key={item.product_id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{item.product_name}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Need {item.required_quantity} {item.unit} · In stock {item.available_stock} {item.unit}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-mono font-bold ${item.is_eligible ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {item.unit_price === null ? 'Not stocked' : `₹${Number(item.line_total).toFixed(2)}`}
                          </p>
                          {item.unit_price !== null && <p className="mt-1 text-[10px] text-slate-500">₹{Number(item.unit_price).toFixed(2)} / unit</p>}
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-600">
                      {vendor.is_eligible
                        ? <>Basket total <strong className="font-mono text-slate-900">₹{Number(vendor.total_price).toFixed(2)}</strong> · <Clock className="inline h-3 w-3" /> up to {vendor.max_lead_time_days} days</>
                        : 'Every item must be in stock at this one vendor.'}
                    </span>
                    {vendor.is_eligible && (
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-800">
                        <input
                          type="radio"
                          name="selected-vendor"
                          checked={String(selectedVendorId) === String(vendor.vendor_id)}
                          onChange={() => setSelectedVendorId(vendor.vendor_id)}
                        />
                        Select this vendor
                      </label>
                    )}
                  </div>

                  {vendor.is_eligible && String(selectedVendorId) === String(vendor.vendor_id) && (
                    <button
                      type="button"
                      disabled={enquirySending}
                      onClick={() => setEnquiryVendor(vendor)}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" /> Proceed with selected vendor
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {enquiryVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="vendor-enquiry-title" className="w-full max-w-lg space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div>
              <h2 id="vendor-enquiry-title" className="font-bold text-slate-900">Send restock request</h2>
              <p className="mt-1 text-xs text-slate-500">This sends all listed products to {enquiryVendor.vendor_name} for approval. No stock or purchase order is created until they approve.</p>
            </div>
            <ul className="max-h-40 space-y-2 overflow-auto rounded-xl bg-slate-50 p-3 text-xs">
              {cart.map((item) => (
                <li key={item.productId} className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-700">{getProductName(item.productId)}</span>
                  <span className="font-bold text-slate-900">{item.quantity}</span>
                </li>
              ))}
            </ul>
            <label className="block text-xs font-semibold text-slate-600">
              Notes for vendor (optional)
              <textarea
                rows="4"
                value={enquiryNotes}
                onChange={(event) => setEnquiryNotes(event.target.value)}
                placeholder="Add delivery or restock notes."
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-500"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEnquiryVendor(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button>
              <button type="button" onClick={handleSendEnquiry} disabled={enquirySending} className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                {enquirySending ? 'Sending request...' : 'Send request to vendor'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default VendorSearch;
