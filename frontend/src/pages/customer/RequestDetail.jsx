import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { ArrowLeft, Clock, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export const RequestDetail = () => {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/customer/requests/${id}`);
        setRequest(res.data.request);
      } catch (err) {
        console.error('Failed to load request details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 text-xs">Loading request audit details...</div>;
  }

  if (!request) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center">
        <p className="text-sm font-semibold text-slate-700">Request Not Found or Access Denied</p>
        <Link to="/customer/requests" className="mt-4 inline-block text-xs font-semibold text-teal-600">
          ← Return to My Requests
        </Link>
      </div>
    );
  }

  // Milestones lifecycle tracking
  const milestones = [
    {
      title: 'Request Created',
      role: 'Customer',
      completed: true,
      time: new Date(request.created_at).toLocaleString(),
      desc: `Submitted for ${request.quantity} ${request.unit} of ${request.product_name}`
    },
    {
      title: 'Reconciliation & Payment',
      role: 'Finance Officer',
      completed: request.status === 'Completed',
      time: request.payment_number ? 'Paid & Fulfilled' : 'Pending reconciliation',
      desc: request.payment_number
        ? `Paid via ${request.payment_number}. Workflow 100% completed.`
        : 'Three-way matching and payment recording pending'
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        to="/customer/requests"
        className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-navy-900 transition"
      >
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to All Requests
      </Link>

      {/* Main Request Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchase Requisition</span>
            <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">{request.request_code}</h1>
          </div>
          <Badge status={request.status} className="text-sm px-3.5 py-1" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 py-6 border-b border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Requested Product</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{request.product_name}</p>
            <p className="text-slate-500">{request.product_category}</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Quantity & Measure</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">{request.quantity} {request.unit}</p>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Needed By</span>
            <p className="font-bold text-slate-800 text-sm mt-0.5">
              {request.required_date ? new Date(request.required_date).toLocaleDateString() : 'Immediate / Standard'}
            </p>
          </div>
        </div>

        {request.description && (
          <div className="pt-6">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Specifications & Comments
            </span>
            <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed font-medium">
              {request.description}
            </p>
          </div>
        )}
      </div>

      {/* Lifecycle Progress Timeline */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center">
          <ShieldCheck className="w-5 h-5 text-teal-600 mr-2" />
          Request & Payment Progress
        </h2>

        <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {milestones.map((m, idx) => (
            <div key={idx} className="relative">
              <div
                className={`absolute -left-6 sm:-left-8 w-7 h-7 rounded-full flex items-center justify-center border-2 ${
                  m.failed
                    ? 'bg-rose-500 border-white text-white shadow'
                    : m.completed
                    ? 'bg-teal-500 border-white text-white shadow'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {m.failed ? (
                  <XCircle className="w-4 h-4" />
                ) : m.completed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Clock className="w-3.5 h-3.5" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-800">{m.title}</h3>
                  <span className="text-[11px] font-mono text-slate-400">{m.time}</span>
                </div>
                <span className="text-[10px] font-bold uppercase text-teal-600 block mt-0.5">{m.role}</span>
                <p className="text-xs text-slate-500 mt-1">{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
