import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { CheckCircle2, Clock3, MapPin, Phone, Truck, XCircle } from 'lucide-react';

const formatDate = (value) => value ? new Date(value).toLocaleString() : '—';

export const VendorEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [legacyEnquiries, setLegacyEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const [basketResponse, legacyResponse] = await Promise.all([
          api.get('/shopkeeper/basket-enquiries'),
          api.get('/shopkeeper/enquiries')
        ]);
        setEnquiries(basketResponse.data.enquiries || []);
        setLegacyEnquiries(legacyResponse.data.enquiries || []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Could not load vendor enquiries.');
      } finally {
        setLoading(false);
      }
    };
    fetchEnquiries();
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Vendor Enquiries & Restock Requests</h1>
        <p className="mt-1 text-xs text-slate-500">See vendor decisions, contact details, dispatch, delivery and payment progress.</p>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">{error}</div>}

      <section className="space-y-4">
        <h2 className="text-sm font-extrabold text-slate-900">Multi-product restock requests</h2>
        {loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-xs text-slate-400">Loading requests...</div>
        ) : enquiries.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500">No restock requests sent yet. Compare vendors and use Proceed to send a request.</div>
        ) : enquiries.map((enquiry) => (
          <article key={enquiry.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <p className="font-mono text-xs font-extrabold text-slate-900">{enquiry.enquiry_code}</p>
                <p className="mt-1 text-[11px] text-slate-500">Sent {formatDate(enquiry.created_at)} · Shop: {enquiry.shop_name || 'Shop'}{enquiry.shop_branch ? ` (${enquiry.shop_branch})` : ''}</p>
                <p className="mt-1 text-xs font-semibold text-slate-700">Vendor: {enquiry.vendor_company || enquiry.vendor_name}</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                  {enquiry.vendor_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{enquiry.vendor_phone}</span>}
                  {enquiry.vendor_address && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{enquiry.vendor_address}</span>}
                </div>
              </div>
              <Badge status={enquiry.status === 'Ordered' ? 'Approved' : enquiry.status} />
            </div>

            {enquiry.vendor_comments && (
              <p className="mx-5 mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
                Vendor response: {enquiry.vendor_comments}
              </p>
            )}

            <div className="divide-y divide-slate-100 px-5">
              {enquiry.items.map((item) => (
                <div key={item.product_id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{item.product_name} · {item.quantity} {item.unit}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {item.quoted_unit_price ? `Quoted ₹${Number(item.quoted_unit_price).toFixed(2)} / ${item.unit}` : 'Awaiting vendor decision'}
                      {item.estimated_days != null ? ` · Estimated ${item.estimated_days} days` : ''}
                    </p>
                    {item.po_number && (
                      <p className="mt-1 text-[11px] text-slate-600">
                        PO {item.po_number} · ₹{Number(item.total_amount).toFixed(2)} · Ordered {formatDate(item.order_date)}
                      </p>
                    )}
                    {item.dispatched_at && <p className="mt-1 text-[11px] text-blue-700">Dispatched {formatDate(item.dispatched_at)}</p>}
                    {item.received_at && <p className="mt-1 text-[11px] text-emerald-700">Received at shop {formatDate(item.received_at)}</p>}
                    {item.payment_number && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-700">
                        Payment {item.payment_number} ({item.payment_status}) · {item.payment_method} · Ref {item.payment_reference || '—'} · ₹{Number(item.payment_amount).toFixed(2)} · {formatDate(item.payment_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    {item.po_number ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
                          <Truck className="h-3 w-3" /> {item.order_status}
                        </span>
                        <Link to={`/shopkeeper/orders/${item.purchase_order_id}`} className="rounded-lg border border-teal-200 px-3 py-1.5 text-[11px] font-bold text-teal-700 hover:bg-teal-50">
                          Order & e-bill
                        </Link>
                      </>
                    ) : enquiry.status === 'Sent' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700"><Clock3 className="h-3.5 w-3.5" /> Awaiting vendor approval</span>
                    ) : enquiry.status === 'Declined' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700"><XCircle className="h-3.5 w-3.5" /> Declined</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Approved</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      {legacyEnquiries.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-slate-800">Earlier single-product enquiries</h2>
          <div className="space-y-2">
            {legacyEnquiries.map((enquiry) => (
              <div key={enquiry.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3 text-xs">
                <span className="font-semibold">{enquiry.enquiry_code} · {enquiry.vendor_name} · {enquiry.product_name} ({enquiry.quantity})</span>
                <Badge status={enquiry.status} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default VendorEnquiries;
