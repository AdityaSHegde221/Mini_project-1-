import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { HelpCircle, Reply, CheckCircle2, AlertCircle, X, MapPin, Phone } from 'lucide-react';

export const VendorEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [basketEnquiries, setBasketEnquiries] = useState([]);
  const [basketComments, setBasketComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeEnquiry, setActiveEnquiry] = useState(null);

  const [availQty, setAvailQty] = useState(0);
  const [quotePrice, setQuotePrice] = useState(0);
  const [estDays, setEstDays] = useState(2);
  const [comments, setComments] = useState('');
  const [respStatus, setRespStatus] = useState('Accepted');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchEnquiries = async () => {
    try {
      const [legacyResponse, basketResponse] = await Promise.all([
        api.get('/vendor/enquiries'),
        api.get('/vendor/basket-enquiries')
      ]);
      setEnquiries(legacyResponse.data.enquiries || []);
      setBasketEnquiries(basketResponse.data.enquiries || []);
    } catch (err) {
      console.error('Failed to load enquiries:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not load vendor enquiries and restock requests.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const handleBasketResponse = async (enquiry, status) => {
    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await api.patch(`/vendor/basket-enquiries/${enquiry.id}/respond`, {
        status,
        comments: basketComments[enquiry.id] || ''
      });
      setFeedback({ type: 'success', message: response.data.message });
      await fetchEnquiries();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Could not respond to the complete restock request.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRespond = (enq) => {
    setActiveEnquiry(enq);
    setAvailQty(enq.available_quantity || enq.quantity);
    setQuotePrice(enq.quoted_price || 0);
    setEstDays(enq.estimated_days || 2);
    setComments(enq.comments || '');
    setRespStatus('Accepted');
    setFeedback(null);
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await api.patch(`/vendor/enquiries/${activeEnquiry.id}/respond`, {
        availableQuantity: Number(availQty),
        quotedPrice: Number(quotePrice),
        estimatedDays: Number(estDays),
        comments,
        status: respStatus
      });

      setFeedback({
        type: 'success',
        message: `Quotation sent for ${activeEnquiry.enquiry_code}! The shopkeeper has received your quotation.`
      });
      setActiveEnquiry(null);
      fetchEnquiries();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to submit response.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Incoming Shopkeeper Enquiries</h1>
        <p className="text-xs text-slate-500">Provide price quotations and availability terms to storekeepers</p>
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

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">Multi-product restock requests</h2>
          <p className="mt-1 text-[11px] text-slate-500">Approve or decline each full basket. Approval reserves stock and creates the purchase orders.</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading restock requests...</div>
        ) : basketEnquiries.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">No multi-product restock requests received.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {basketEnquiries.map((enquiry) => (
              <article key={enquiry.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-extrabold text-navy-900">{enquiry.enquiry_code}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-800">{enquiry.shop_name || 'Shop'}{enquiry.shop_branch ? ` · ${enquiry.shop_branch}` : ''} — {enquiry.shopkeeper_name}</p>
                    <p className="mt-1 text-[11px] text-slate-500">Received {new Date(enquiry.created_at).toLocaleString()}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      {enquiry.shopkeeper_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{enquiry.shopkeeper_phone}</span>}
                      {enquiry.shop_address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{enquiry.shop_address}</span>}
                    </div>
                    {enquiry.notes && <p className="mt-2 text-xs text-slate-600">Shop notes: {enquiry.notes}</p>}
                  </div>
                  <Badge status={enquiry.status === 'Ordered' ? 'Approved' : enquiry.status} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {enquiry.items.map((item) => (
                    <div key={item.product_id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                      <p className="font-bold text-slate-800">{item.product_name} · {item.quantity} {item.unit}</p>
                      {item.quoted_unit_price != null && <p className="mt-1 text-[11px] text-slate-500">₹{Number(item.quoted_unit_price).toFixed(2)} / unit · PO {item.po_number || 'created'}</p>}
                      {item.order_status && <p className="mt-1 text-[11px] font-semibold text-teal-700">Shipment: {item.order_status}</p>}
                    </div>
                  ))}
                </div>
                {enquiry.status === 'Sent' && (
                  <div className="mt-4 flex flex-wrap items-end gap-2">
                    <label className="min-w-56 flex-1 text-[11px] font-semibold text-slate-600">
                      Decision notes (optional)
                      <input
                        value={basketComments[enquiry.id] || ''}
                        onChange={(event) => setBasketComments((current) => ({ ...current, [enquiry.id]: event.target.value }))}
                        maxLength={2000}
                        className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      />
                    </label>
                    <button type="button" disabled={submitting} onClick={() => handleBasketResponse(enquiry, 'Declined')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">Decline all</button>
                    <button type="button" disabled={submitting} onClick={() => handleBasketResponse(enquiry, 'Approved')} className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve & create order</button>
                  </div>
                )}
                {enquiry.vendor_comments && <p className="mt-3 text-xs text-slate-600">Your response: {enquiry.vendor_comments}</p>}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h2 className="font-bold text-slate-900">Earlier single-product enquiries</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading enquiries...</div>
          ) : enquiries.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              No procurement enquiries received yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Enquiry Code</th>
                  <th className="px-6 py-4">Shopkeeper</th>
                  <th className="px-6 py-4">Product Details</th>
                  <th className="px-6 py-4">Requested Qty</th>
                  <th className="px-6 py-4">Received Date</th>
                  <th className="px-6 py-4">Your Quote</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {enquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{enq.enquiry_code}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{enq.shopkeeper_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{enq.product_name}</p>
                      <p className="text-[11px] text-slate-400">{enq.product_category}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{enq.quantity} {enq.product_unit}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(enq.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      {enq.quoted_price ? (
                        <div>
                          <span className="font-bold text-emerald-700">₹{Number(enq.quoted_price).toFixed(2)}/unit</span>
                          <span className="text-[11px] text-slate-400 block">Avail: {enq.available_quantity} • {enq.estimated_days} days</span>
                        </div>
                      ) : (
                        <span className="text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Pending Response
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={enq.status} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenRespond(enq)}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 border border-teal-200 rounded-lg font-semibold transition inline-flex items-center space-x-1"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        <span>{enq.quoted_price ? 'Update Quote' : 'Respond'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Respond Modal */}
      {activeEnquiry && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enquiry Quotation</h3>
                <p className="text-xs text-slate-500 font-mono">{activeEnquiry.enquiry_code}</p>
              </div>
              <button onClick={() => setActiveEnquiry(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendResponse} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <p className="text-slate-600"><strong>Product:</strong> {activeEnquiry.product_name}</p>
                <p className="text-slate-600 mt-0.5"><strong>Requested Quantity:</strong> {activeEnquiry.quantity} {activeEnquiry.product_unit}</p>
                {activeEnquiry.notes && (
                  <p className="text-slate-500 mt-1 italic">Notes: "{activeEnquiry.notes}"</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Available Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={availQty}
                    onChange={(e) => setAvailQty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Quoted Price (₹/unit)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Est. Days to Deliver
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={estDays}
                    onChange={(e) => setEstDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                    Accept or Decline
                  </label>
                  <select
                    value={respStatus}
                    onChange={(e) => setRespStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                  >
                    <option value="Accepted">Accept & Quote</option>
                    <option value="Declined">Decline Enquiry</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Comments / Warranty Terms
                </label>
                <textarea
                  rows="2"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g. Includes 1-year manufacturer warranty and free delivery."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 resize-none font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveEnquiry(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 font-bold rounded-xl text-white transition shadow"
                >
                  {submitting ? 'Submitting...' : 'Send Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorEnquiries;
