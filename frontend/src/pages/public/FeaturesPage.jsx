import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, Store, Building, Truck, DollarSign, Check, ShieldCheck } from 'lucide-react';

export const FeaturesPage = () => {
  const roleFeatures = [
    {
      role: 'Customer',
      icon: Users,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      features: [
        'Interactive purchase request creation with real-time product catalog lookup',
        'Automatic generation of unique request identifiers (e.g. REQ-1001)',
        'Full lifecycle status tracking (Pending → Approved → Ordered → Received → Completed)',
        'Real-time notifications upon shopkeeper approval or order milestone completion'
      ]
    },
    {
      role: 'Shopkeeper',
      icon: Store,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      features: [
        'Incoming request triage queue with single-click approve or reject actions',
        'Vendor comparison engine enforcing full-quantity single-vendor selection',
        'Automated lowest-price recommendation among eligible vendors',
        'Direct enquiry dispatch to selected suppliers with response tracking',
        'Concurrently safe purchase order confirmation with row-level stock locking'
      ]
    },
    {
      role: 'Vendor',
      icon: Building,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
      features: [
        'Live inventory stock and unit pricing management',
        'Incoming enquiry queue with quotation and availability responses',
        'Purchase order fulfillment confirmations',
        'Digital invoice creation linked directly to confirmed purchase orders'
      ]
    },
    {
      role: 'Warehouse Staff',
      icon: Truck,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      features: [
        'Queue of incoming shipments expected from confirmed purchase orders',
        'Goods Receipt Note (GRN) logging with item quantity validation',
        'Inspection records for damaged or missing goods preventing silent mismatches',
        'Physical inventory receipt ledger with warehouse location tracking'
      ]
    },
    {
      role: 'Finance Officer',
      icon: DollarSign,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      features: [
        'Mandatory Three-Way Reconciliation engine comparing PO vs GRN vs Invoice',
        'Automated mismatch detection blocking payments when quantities or prices differ',
        'Audit-compliant payment recording (NEFT / RTGS) after approved reconciliation',
        'Comprehensive financial reports, spending distributions, and Recharts analytics'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-teal-500 selection:text-white">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-xs font-semibold text-slate-300 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <span className="text-xs text-teal-400 font-mono">System Capabilities</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto py-16 px-6">
        <div className="text-center mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Enterprise Capabilities</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mt-2">Features by Role</h1>
          <p className="text-slate-400 text-sm mt-3 max-w-2xl mx-auto">
            Every role possesses tailored workflows and permissions to maintain end-to-end operational integrity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {roleFeatures.map((rf) => {
            const Icon = rf.icon;
            return (
              <div key={rf.role} className="bg-slate-950 rounded-2xl p-7 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${rf.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-4">{rf.role} Features</h3>
                  <ul className="space-y-3">
                    {rf.features.map((f, i) => (
                      <li key={i} className="flex items-start text-xs text-slate-300 leading-relaxed">
                        <Check className="w-4 h-4 text-teal-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <Link
                    to={`/login/${rf.role.toLowerCase()}`}
                    className="text-xs font-semibold text-teal-400 hover:text-teal-300 inline-flex items-center"
                  >
                    Open {rf.role} Portal <ArrowLeft className="w-3.5 h-3.5 ml-1 rotate-180" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeaturesPage;
