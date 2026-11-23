import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, Mail, Phone, MapPin, Database } from 'lucide-react';

export const WarehouseProfile = () => {
  const { user, profile } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">Warehouse Staff Member</span>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{user?.full_name}</h1>
            <p className="text-xs text-slate-500 font-medium">{profile?.warehouse_name || 'Central Distribution Hub'}</p>
          </div>
        </div>

        <div className="space-y-5 text-xs">
          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <Mail className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Official Email</span>
              <span className="font-bold text-slate-800 text-sm">{user?.email}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Warehouse Location Code</span>
              <span className="font-bold font-mono text-slate-800 text-sm">{profile?.location_code || 'WH-BLR-01'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Physical Facility Address</span>
              <span className="font-medium text-slate-700 leading-relaxed block mt-0.5">
                {profile?.address || 'Gate 3, Logistics Park, Nelamangala, Bengaluru'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-amber-900">
              <Database className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-xs">PostgreSQL Role Permissions</span>
            </div>
            <span className="px-2.5 py-1 bg-amber-600 text-white font-bold rounded-lg text-[10px] uppercase">
              Role: Warehouse
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WarehouseProfile;
