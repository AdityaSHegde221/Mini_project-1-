import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { DollarSign, Mail, Award, ShieldCheck, Database, FileCheck } from 'lucide-react';

export const FinanceProfile = () => {
  const { user, profile } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-purple-700 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 block">Authorized Finance Officer</span>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{user?.full_name}</h1>
            <p className="text-xs text-slate-500 font-mono">Employee Code: {profile?.employee_code || 'FIN-001'}</p>
          </div>
        </div>

        <div className="space-y-5 text-xs">
          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Finance Email</span>
              <span className="font-bold text-slate-800 text-sm">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Award className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Disbursal Approval Authority</span>
              <span className="font-bold text-slate-800 text-sm">
                Up to ₹{Number(profile?.approval_limit || 10000000).toLocaleString('en-IN')} per transaction
              </span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <ShieldCheck className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Reconciliation Engine Protocol</span>
              <span className="font-medium text-slate-700 leading-relaxed block mt-0.5">
                Automated 3-Way Cross Check (PO vs GRN vs Vendor Invoice) with strict discrepancy enforcement.
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-purple-900">
              <Database className="w-4 h-4 text-purple-600" />
              <span className="font-semibold text-xs">PostgreSQL Role Permissions</span>
            </div>
            <span className="px-2.5 py-1 bg-purple-700 text-white font-bold rounded-lg text-[10px] uppercase">
              Role: Finance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceProfile;
