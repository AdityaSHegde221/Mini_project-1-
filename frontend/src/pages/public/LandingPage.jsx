import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Users
} from 'lucide-react';

const portals = [
  {
    name: 'Customer',
    role: 'customer',
    icon: Users,
    description: 'Browse groceries, send a request, and follow its progress.',
    email: 'customer@procurement.com'
  },
  {
    name: 'Shopkeeper',
    role: 'shopkeeper',
    icon: Store,
    description: 'Review grocery requests and compare supplier availability and prices.',
    email: 'shopkeeper@procurement.com'
  },
  {
    name: 'Vendor',
    role: 'vendor',
    icon: PackageSearch,
    description: 'Manage grocery stock, respond to enquiries, and view orders.',
    email: 'vendorc@procurement.com'
  },
  {
    name: 'Finance',
    role: 'finance',
    icon: CircleDollarSign,
    description: 'Review invoices, reconcile orders, and record payments.',
    email: 'finance@procurement.com'
  },
  {
    name: 'Admin',
    role: 'admin',
    icon: ShieldCheck,
    description: 'Manage user access, shops, the shared catalog, and every shop listing.',
    email: 'admin@procurement.com'
  }
];

export const LandingPage = () => (
  <div className="min-h-screen bg-[#f7f8f2] text-slate-900">
    <header className="border-b border-emerald-100 bg-white">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="FreshCart home">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
            <ShoppingBasket className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-black tracking-tight">FreshCart</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Local grocery compare</span>
          </span>
        </Link>

        <a
          href="#login"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
        >
          Choose a login <ArrowRight className="h-4 w-4" />
        </a>
      </nav>
    </header>

    <main>
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Grocery ordering, made simple
          </span>
          <h1 className="mt-6 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Find your everyday groceries. Compare before you request.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Browse the grocery catalog, send a request, and let your shopkeeper review supplier prices and availability. This app is for orders and comparison — <strong className="text-slate-800">delivery is not offered.</strong>
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#login" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700">
              Start shopping <ArrowRight className="h-4 w-4" />
            </a>
            <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-600">
              <Store className="h-4 w-4 text-emerald-700" />
              Shop collection only
            </span>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
            {['Grocery catalog', 'Supplier price comparison', 'No delivery service'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -left-7 top-12 h-36 w-36 rounded-full bg-lime-200/70 blur-3xl" />
          <div className="absolute -right-4 bottom-5 h-40 w-40 rounded-full bg-emerald-200/70 blur-3xl" />
          <div className="relative rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-2xl shadow-emerald-900/10 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Your grocery list</p>
                <h2 className="mt-1 text-xl font-extrabold">Start with what you need</h2>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <Search className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                ['Aashirvaad Chakki Atta', 'Flours & Atta'],
                ['India Gate Basmati Rice', 'Rice & Grains'],
                ['Tata Sampann Toor Dal', 'Dals & Pulses']
              ].map(([name, category], index) => (
                <div key={name} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#fbfcf8] p-3.5">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${index === 1 ? 'bg-amber-50 text-amber-700' : index === 2 ? 'bg-orange-50 text-orange-700' : 'bg-lime-50 text-lime-700'}`}>
                    <ShoppingBasket className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{category}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
              <Store className="h-5 w-5 shrink-0" />
              <p><strong>Collection only.</strong> Coordinate collection with the shop after your request is reviewed.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="login" className="border-y border-slate-200 bg-white px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-700">Welcome to FreshCart</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Choose how you want to log in</h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-slate-500">Five secure portals for customers, shops, suppliers, finance, and platform admins.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {portals.map(({ name, role, icon: Icon, description, email }) => (
              <article key={role} className="flex flex-col rounded-3xl border border-slate-200 bg-[#fbfcf8] p-5 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-900/5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 text-lg font-extrabold">{name}</h3>
                <p className="mt-2 min-h-12 flex-1 text-sm leading-6 text-slate-600">{description}</p>
                <p className="mt-4 truncate text-xs text-slate-500">Demo: {email} <span className="text-slate-400">/ pass123</span></p>
                <Link
                  to={`/login/${role}`}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                >
                  Login as {name} <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>

    <footer className="px-5 py-7 text-center text-xs text-slate-500">
      FreshCart · Compare grocery sourcing options · Collection only, no delivery
    </footer>
  </div>
);

export default LandingPage;
