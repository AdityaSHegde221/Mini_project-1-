import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Database, Shield, Zap, Lock, Cpu, Server } from 'lucide-react';

export const AboutPage = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-teal-500 selection:text-white">
      <nav className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="inline-flex items-center text-xs font-semibold text-slate-300 hover:text-white transition">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
          <span className="text-xs text-teal-400 font-mono">Architectural Specification</span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-16 px-6">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">System Architecture</span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white mt-2">About Centralized Procurement</h1>
          <p className="text-slate-400 text-sm mt-3 max-w-2xl mx-auto">
            Designed to eliminate the pitfalls of siloed procurement systems, inventory race conditions, and unverified payments.
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-950 rounded-2xl p-8 border border-slate-800">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-bold text-white">Centralized Relational Core (PostgreSQL)</h2>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed mb-4">
              Unlike legacy systems relying on fragmented spreadsheets or browser local storage, our architecture synchronizes all 6 roles through a unified PostgreSQL relational schema. Every request, order, receipt, invoice, and payment transition is executed with strict foreign key constraints and ACID transaction isolation.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
              <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" /> 16 Normalized Database Tables</li>
              <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" /> Foreign Key Cascade Rules</li>
              <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" /> Row-Level Lock Stock Decrement</li>
              <li className="flex items-center"><CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2" /> Immutable Audit Trail</li>
            </ul>
          </div>

          <div className="bg-slate-950 rounded-2xl p-8 border border-slate-800">
            <div className="flex items-center space-x-3 mb-4">
              <Lock className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-bold text-white">Concurrency & Race Condition Prevention</h2>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              When multiple simultaneous requests target the same vendor inventory, Engine 4 initiates a PostgreSQL <code className="text-teal-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">SELECT ... FOR UPDATE</code> lock. This serializes database row access, preventing overselling and ensuring zero negative balances.
            </p>
          </div>

          <div className="bg-slate-950 rounded-2xl p-8 border border-slate-800">
            <div className="flex items-center space-x-3 mb-4">
              <Cpu className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-bold text-white">Single-Vendor Decision Rule</h2>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              To guarantee procurement simplicity and contractual accountability, purchase requests cannot be split across multiple suppliers. A vendor is only eligible if <code className="text-teal-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">available_stock &gt;= requested_quantity</code>. The engine evaluates all suppliers and recommends the lowest-price eligible vendor.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-sm shadow-lg shadow-teal-500/25 transition"
          >
            Explore Role Portals <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
