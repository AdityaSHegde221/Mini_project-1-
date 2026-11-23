import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users, Store, Building, Truck, DollarSign,
  ShieldCheck, Lock, Mail, ArrowLeft, AlertCircle, Sparkles, Eye, EyeOff
} from 'lucide-react';

export const RoleLoginPage = () => {
  const { roleName } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formattedRole = roleName
    ? roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase()
    : 'Customer';

  const roleConfigs = {
    Customer: {
      title: 'Customer Portal',
      subtitle: 'Browse groceries, request price comparisons & track orders',
      icon: Users,
      gradient: 'from-blue-600 to-indigo-700',
      accent: 'blue',
      demoName: 'Arun Sharma',
      demoOrg: 'Sharma Household Provisions',
      demoEmail: 'customer@procurement.com',
      demoPass: 'pass123',
      registerLink: '/register/customer',
      features: ['Browse grocery catalog', 'Request supplier price comparison', 'Collection only — no delivery']
    },
    Shopkeeper: {
      title: 'Shopkeeper Portal',
      subtitle: 'Approve requests, select vendors & issue POs',
      icon: Store,
      gradient: 'from-slate-700 to-slate-900',
      accent: 'slate',
      demoName: 'Rajesh Kumar Shenoy',
      demoOrg: 'Ramesh Kirana & Provision Stores',
      demoEmail: 'shopkeeper@procurement.com',
      demoPass: 'pass123',
      registerLink: '/register/shopkeeper',
      features: ['Review incoming requests', 'E2 Vendor Selection Engine', 'Confirm Purchase Orders']
    },
    Vendor: {
      title: 'Grocery Supplier Portal',
      subtitle: 'Manage wholesale stock & respond to enquiries',
      icon: Building,
      gradient: 'from-teal-600 to-emerald-700',
      accent: 'teal',
      demoName: 'Pradeep Patil',
      demoOrg: 'Deccan Pulses & Grains Wholesale Depot',
      demoEmail: 'vendorc@procurement.com',
      demoPass: 'pass123',
      registerLink: '/register/vendor',
      features: ['Manage grocery inventory', 'Respond to quotation enquiries', 'Submit digital invoices']
    },
    Warehouse: {
      title: 'Warehouse Staff Portal',
      subtitle: 'Inspect shipments & log goods receipts (GRN)',
      icon: Truck,
      gradient: 'from-amber-600 to-orange-700',
      accent: 'amber',
      demoName: 'Devendra Singh',
      demoOrg: 'Central Agro Logistics Distribution Depot',
      demoEmail: 'warehouse@procurement.com',
      demoPass: 'pass123',
      features: ['Inspect incoming shipments', 'Create GRN records', 'Log damaged / shortage']
    },
    Finance: {
      title: 'Finance Officer Portal',
      subtitle: 'Execute 3-way reconciliation & disburse payments',
      icon: DollarSign,
      gradient: 'from-violet-600 to-purple-800',
      accent: 'violet',
      demoName: 'Meera Krishnan',
      demoOrg: 'Central Accounts & Disbursal Division',
      demoEmail: 'finance@procurement.com',
      demoPass: 'pass123',
      registerLink: '/register/finance',
      features: ['3-Way Reconciliation (E3)', 'Block discrepancies', 'Disburse bank payments']
    },
    Admin: {
      title: 'Admin Console',
      subtitle: 'Manage accounts, products, shops & requests',
      icon: ShieldCheck,
      gradient: 'from-emerald-700 to-teal-900',
      accent: 'emerald',
      demoName: 'FreshCart Administrator',
      demoOrg: 'Platform Administration',
      demoEmail: 'admin@procurement.com',
      demoPass: 'pass123',
      registrationNote: 'Admin accounts can only be created by an authenticated Admin in the Admin console.',
      features: ['Manage user and shop access', 'Control catalog & shop listings', 'View all requests & orders']
    }
  };

  const config = roleConfigs[formattedRole] || roleConfigs.Customer;
  const Icon = config.icon;

  const handleFillDemo = () => {
    setEmail(config.demoEmail);
    setPassword(config.demoPass);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login(email, password, formattedRole);
      navigate(`/${loggedInUser.role.toLowerCase()}/home`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Background decorative circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative z-10">
        {/* Back link */}
        <Link to="/" className="inline-flex items-center text-xs text-slate-400 hover:text-white mb-6 transition group">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>

        <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          {/* Top gradient header */}
          <div className={`bg-gradient-to-r ${config.gradient} p-7 relative`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center border border-white/20">
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{config.title}</h1>
                <p className="text-xs text-white/70 mt-0.5">{config.subtitle}</p>
              </div>
            </div>
            {/* Feature pills */}
            <div className="relative mt-5 flex flex-wrap gap-2">
              {config.features.map((f, i) => (
                <span key={i} className="px-2.5 py-1 bg-white/10 border border-white/15 text-white/80 text-[10px] font-medium rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className="p-7">
            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start space-x-3 text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Demo Quick Fill */}
            <div className="mb-6 p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold tracking-widest uppercase text-teal-400 block">Demo Evaluation Account</span>
                  <span className="text-sm font-bold text-white block mt-0.5 truncate">{config.demoName}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{config.demoOrg}</span>
                  <span className="text-xs font-mono text-teal-300 block mt-1">{config.demoEmail}</span>
                </div>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="ml-3 flex-shrink-0 px-3 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-semibold rounded-xl flex items-center space-x-1.5 transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto Fill</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@procurement.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition placeholder-slate-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition placeholder-slate-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-3 text-slate-500 hover:text-slate-300 transition"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 bg-gradient-to-r ${config.gradient} text-white font-bold text-sm rounded-xl transition shadow-lg hover:opacity-90 disabled:opacity-50 mt-2`}
              >
                {loading ? 'Authenticating...' : `Sign In as ${formattedRole}`}
              </button>
            </form>

            {config.registerLink && (
              <div className="mt-5 pt-5 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  New user?{' '}
                  <Link to={config.registerLink} className="text-teal-400 hover:underline font-semibold">
                    Register as {formattedRole}
                  </Link>
                </p>
              </div>
            )}
            {config.registrationNote && (
              <p className="mt-5 border-t border-slate-800 pt-5 text-center text-[11px] text-slate-500">
                {config.registrationNote}
              </p>
            )}

            <p className="mt-4 text-center text-[11px] text-slate-600">
              Your account is protected with role-based access
            </p>
          </div>
        </div>

        {/* Portal links at bottom */}
        <div className="mt-5 flex justify-center gap-2 flex-wrap">
          {[
            { r: 'customer', label: 'Customer' },
            { r: 'shopkeeper', label: 'Shopkeeper' },
            { r: 'vendor', label: 'Vendor' },
            { r: 'finance', label: 'Finance' },
            { r: 'admin', label: 'Admin' },
          ].map(({ r, label }) => (
            <Link
              key={r}
              to={`/login/${r}`}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition ${
                r === roleName
                  ? 'bg-white text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleLoginPage;