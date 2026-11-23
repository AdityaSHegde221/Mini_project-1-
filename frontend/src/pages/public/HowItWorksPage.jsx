import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowDown, Users, Store, Building, Truck, DollarSign, CheckCircle2 } from 'lucide-react';

export const HowItWorksPage = () => {
  const steps = [
    {
      step: '01',
      role: 'Customer',
      title: 'Submit Purchase Request',
      desc: 'Customer selects product, specifies quantity, required date, and submits. Unique Request ID (e.g., REQ-1001) is created in PostgreSQL with status "Pending". Shopkeeper is notified immediately.',
      icon: Users,
      badge: 'Pending'
    },
    {
      step: '02',
      role: 'Shopkeeper',
      title: 'Triage & Approval Decision',
      desc: 'Shopkeeper reviews incoming requests, approves or rejects with a reason. Customer status updates instantly in real-time. If approved, status transitions to "Approved".',
      icon: Store,
      badge: 'Approved'
    },
    {
      step: '03',
      role: 'Shopkeeper & Vendor',
      title: 'Vendor Discovery & Decision Engine',
      desc: 'Engine 2 filters vendors with full required quantity (available_stock >= requested_qty). Sorts by unit price ASC to recommend lowest-price supplier. Enquiries can be dispatched and answered.',
      icon: Building,
      badge: 'Vendor Selected'
    },
    {
      step: '04',
      role: 'Shopkeeper & Vendor',
      title: 'Row-Lock Stock Reservation & PO Confirmation',
      desc: 'Engine 4 locks the selected vendor stock with SELECT ... FOR UPDATE. Revalidates inventory atomically, decrements stock, issues Purchase Order (PO-2001), and updates status to "Ordered".',
      icon: Store,
      badge: 'Ordered'
    },
    {
      step: '05',
      role: 'Warehouse Staff',
      title: 'Goods Receipt & Inspection (GRN)',
      desc: 'Upon shipment delivery, warehouse logs received quantity, damaged items, and missing items. Generates Goods Receipt Note (GRN-3001). Request status updates to "Received".',
      icon: Truck,
      badge: 'Received'
    },
    {
      step: '06',
      role: 'Vendor & Finance',
      title: 'Three-Way Reconciliation & Payment',
      desc: 'Vendor submits digital Invoice (INV-4001). Finance executes 3-Way Match comparing PO, GRN, and Invoice. If discrepancy exists, payment is blocked! If matched, payment (PAY-6001) is recorded.',
      icon: DollarSign,
      badge: 'Completed'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-teal-500 selection:text-white">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-xs font-semibold text-slate-300 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <span className="text-xs text-teal-400 font-mono">End-to-End Workflow</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Lifecycle Progression</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mt-2">How It Works</h1>
          <p className="text-slate-400 text-sm mt-3 max-w-xl mx-auto">
            The complete 6-stage lifecycle connecting all 6 roles across one centralized PostgreSQL database.
          </p>
        </div>

        <div className="space-y-8 relative">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div key={s.step} className="bg-slate-950 rounded-2xl p-7 border border-slate-800 relative flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-teal-400 flex items-center justify-center font-bold text-base flex-shrink-0">
                  {s.step}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                      {s.role} Action
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-300 border border-slate-700">
                      Status: {s.badge}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-14 text-center">
          <Link
            to="/login/customer"
            className="inline-flex items-center px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-500/25 transition"
          >
            Start Workflow as Customer <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;
