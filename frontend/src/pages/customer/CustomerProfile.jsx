import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Building2, Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

export const CustomerProfile = () => {
  const { user, profile } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-navy-800 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
            {user?.full_name?.charAt(0) || 'C'}
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">Customer Account</span>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{user?.full_name}</h1>
            <p className="text-xs text-slate-500 font-medium">{profile?.organization || 'Enterprise Client'}</p>
          </div>
        </div>

        <div className="space-y-5 text-xs">
          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Account Email</span>
              <span className="font-bold text-slate-800 text-sm">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Phone className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Phone Number</span>
              <span className="font-bold text-slate-800 text-sm">{user?.phone || 'Not configured'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Building2 className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Department / Lab</span>
              <span className="font-bold text-slate-800 text-sm">{profile?.department || 'General R&D'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Customer Address</span>
              <span className="font-medium text-slate-700 leading-relaxed block mt-0.5">
                {profile?.address || 'Not provided'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-teal-800">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span className="font-semibold text-xs">Account access protected</span>
            </div>
            <span className="px-2.5 py-1 bg-teal-600 text-white font-bold rounded-lg text-[10px] uppercase">
              Role: Customer
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
