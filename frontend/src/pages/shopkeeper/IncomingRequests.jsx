import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import { Check, X, Search, CheckCircle2, XCircle, AlertCircle, Eye, ArrowRight } from 'lucide-react';

export const IncomingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [filter, setFilter] = useState('All');

  const fetchRequests = async () => {
    try {
      const res = await api.get('/shopkeeper/requests');
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async () => {
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/shopkeeper/requests/${selectedReq.id}/approve`, { reason });
      setSuccessMsg(`Request ${selectedReq.request_code} approved successfully! Customer has been notified.`);
      setActionType(null);
      setSelectedReq(null);
      setReason('');
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to approve request.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason || reason.trim().length === 0) {
      setError('A rejection reason is required.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await api.patch(`/shopkeeper/requests/${selectedReq.id}/reject`, { reason });
      setSuccessMsg(`Request ${selectedReq.request_code} rejected. Customer has been notified.`);
      setActionType(null);
      setSelectedReq(null);
      setReason('');
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject request.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = requests.filter(r => {
    if (filter === 'All') return true;
    return r.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incoming Customer Requests</h1>
          <p className="text-xs text-slate-500">Approve or reject customer purchase requisitions before supplier discovery</p>
        </div>
        <div className="flex items-center space-x-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-sm">
          {['All', 'Pending', 'Approved', 'Rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                filter === status ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Requests Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading customer requests...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">No requisitions match the selected filter.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Request Code</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Product Requested</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Submitted Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition">
                    <td className="px-6 py-4 font-mono font-bold text-navy-900">{req.request_code}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{req.customer_name}</p>
                      <p className="text-[11px] text-slate-400">{req.organization || 'Client Org'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{req.product_name}</p>
                      <p className="text-[11px] text-slate-400">{req.product_category}</p>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{req.quantity} {req.unit}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(req.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={req.status} />
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {req.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('approve');
                              setReason('Quantity and departmental budget verified.');
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold hover:bg-emerald-100 transition inline-flex items-center"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" /> Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedReq(req);
                              setActionType('reject');
                              setReason('');
                            }}
                            className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-semibold hover:bg-rose-100 transition inline-flex items-center"
                          >
                            <X className="w-3.5 h-3.5 mr-1" /> Reject
                          </button>
                        </>
                      ) : req.status === 'Approved' ? (
                        <Link
                          to={`/shopkeeper/vendors?productId=${req.product_id}&qty=${req.quantity}&reqId=${req.id}`}
                          className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg font-semibold hover:bg-teal-100 transition inline-flex items-center"
                        >
                          <Search className="w-3.5 h-3.5 mr-1" /> Compare Vendors
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Triage Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Approve / Reject Modal Dialog */}
      {actionType && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${actionType === 'approve' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {actionType === 'approve' ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === 'approve' ? 'Approve Purchase Request' : 'Reject Purchase Request'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">{selectedReq.request_code}</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs mb-4">
              <p className="text-slate-600"><strong>Customer:</strong> {selectedReq.customer_name} ({selectedReq.organization})</p>
              <p className="text-slate-600 mt-0.5"><strong>Product:</strong> {selectedReq.quantity} {selectedReq.unit} of {selectedReq.product_name}</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                {actionType === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason (Required)'}
              </label>
              <textarea
                rows="3"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={actionType === 'approve' ? 'e.g. Approved under IT hardware research quota.' : 'e.g. Budget exceeded or duplicate requisition.'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-teal-500 focus:outline-none resize-none font-medium"
              ></textarea>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedReq(null);
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={actionType === 'approve' ? handleApprove : handleReject}
                className={`px-4 py-2 font-bold text-xs rounded-xl text-white transition shadow ${
                  actionType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionLoading ? 'Processing...' : actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomingRequests;
