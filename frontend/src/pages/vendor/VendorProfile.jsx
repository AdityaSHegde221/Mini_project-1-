import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building, Mail, Phone, MapPin, ShieldCheck, Database, Award, FileText } from 'lucide-react';

export const VendorProfile = () => {
  const { user, profile } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
            <Building className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">Verified Supplier</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center">
                ★ {profile?.rating || '4.50'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{profile?.company_name || user?.full_name}</h1>
            <p className="text-xs text-slate-500 font-medium">Contact Person: {user?.full_name}</p>
          </div>
        </div>

        <div className="space-y-5 text-xs">
          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Business Email</span>
              <span className="font-bold text-slate-800 text-sm">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Tax Registration / GSTIN</span>
              <span className="font-bold font-mono text-slate-800 text-sm">{profile?.tax_id || 'GSTIN29ABCDE1234F1Z5'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Supplier Contact Number</span>
              <span className="font-bold text-slate-800 text-sm">{user?.phone || '+91 98765 43213'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Warehouse / Supply Facility Address</span>
              <span className="font-medium text-slate-700 leading-relaxed block mt-0.5">
                {profile?.address || 'Plot 45, Peenya Industrial Area, Bengaluru'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-teal-800">
              <Database className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-xs">PostgreSQL Role Permissions</span>
            </div>
            <span className="px-2.5 py-1 bg-teal-600 text-white font-bold rounded-lg text-[10px] uppercase">
              Role: Vendor
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorProfile;
