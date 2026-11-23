import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoaderCircle, Menu, Search, X } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const SEARCH_SECTIONS = {
  Customer: [
    { path: '/customer/products', to: '/customer/home', label: 'Groceries' },
    { path: '/customer/requests', to: '/customer/requests', label: 'Requests' },
    { path: '/customer/retail-orders', to: '/customer/orders', label: 'Retail orders' },
    { path: '/customer/payments', to: '/customer/payments', label: 'Payments' },
  ],
  Shopkeeper: [
    { path: '/shopkeeper/requests', to: '/shopkeeper/requests', label: 'Requests' },
    { path: '/shopkeeper/inventory', to: '/shopkeeper/inventory', label: 'Store products' },
    { path: '/shopkeeper/retail-orders', to: '/shopkeeper/orders', label: 'Customer orders' },
    { path: '/shopkeeper/enquiries', to: '/shopkeeper/enquiries', label: 'Vendor enquiries' },
    { path: '/shopkeeper/orders', to: '/shopkeeper/orders', label: 'Purchase orders' },
  ],
  Vendor: [
    { path: '/vendor/products', to: '/vendor/products', label: 'Products and stock' },
    { path: '/vendor/enquiries', to: '/vendor/enquiries', label: 'Enquiries' },
    { path: '/vendor/orders', to: '/vendor/orders', label: 'Orders' },
    { path: '/vendor/invoices', to: '/vendor/invoices', label: 'Invoices' },
    { path: '/vendor/profile', to: '/vendor/profile', label: 'Profile' },
  ],
  Finance: [
    { path: '/finance/purchase-orders', to: '/finance/purchase-orders', label: 'Purchase orders' },
    { path: '/finance/receipts', to: '/finance/receipts', label: 'Goods receipts' },
    { path: '/finance/invoices', to: '/finance/invoices', label: 'Invoices' },
    { path: '/finance/reconciliations', to: '/finance/reconciliation', label: 'Reconciliations' },
    { path: '/finance/payments', to: '/finance/payments', label: 'Payments' },
    { path: '/finance/reports', to: '/finance/reports', label: 'Financial reports' },
  ],
};

const collectRecords = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap(collectRecords);
  }
  if (!value || typeof value !== 'object') {
    return [];
  }

  const nestedValues = Object.values(value).filter(
    (item) => item && typeof item === 'object'
  );
  const records = nestedValues.flatMap(collectRecords);
  const primitiveEntries = Object.entries(value).filter(
    ([, item]) => item === null || ['string', 'number', 'boolean'].includes(typeof item)
  );

  return primitiveEntries.length > 0 ? [value, ...records] : records;
};

const getRecordTitle = (record) => {
  const keys = [
    'request_code', 'po_number', 'invoice_number', 'order_number', 'product_name',
    'name', 'store_name', 'company_name', 'full_name', 'email', 'id',
  ];
  const key = keys.find((candidate) => record[candidate] !== undefined && record[candidate] !== null);
  return key ? String(record[key]) : 'Matching record';
};

const getRecordDescription = (record, query) => {
  const values = Object.values(record)
    .filter((value) => value !== null && ['string', 'number', 'boolean'].includes(typeof value))
    .map(String);
  const matchingValue = values.find((value) => value.toLowerCase().includes(query.toLowerCase()));
  return matchingValue || values.slice(0, 3).join(' · ');
};

export const Navbar = ({ openMobile }) => {
  const { user, role } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();
    const searchTerm = query.trim();
    if (!searchTerm) {
      setResults([]);
      setSearchError('Enter a search term.');
      setIsSearchOpen(true);
      return;
    }

    const sections = SEARCH_SECTIONS[role] || [];
    setSearching(true);
    setSearchError('');
    setResults([]);
    setIsSearchOpen(true);

    const responses = await Promise.allSettled(
      sections.map(async (section) => ({
        section,
        data: (await api.get(section.path)).data,
      }))
    );

    const matchingResults = [];
    const failedSections = [];
    responses.forEach((response, index) => {
      if (response.status !== 'fulfilled') {
        failedSections.push(sections[index].label);
        return;
      }

      const { section, data } = response.value;
      collectRecords(data).forEach((record) => {
        const searchableText = Object.values(record)
          .filter((value) => value !== null && ['string', 'number', 'boolean'].includes(typeof value))
          .join(' ')
          .toLowerCase();
        if (searchableText.includes(searchTerm.toLowerCase())) {
          let to = section.to;
          if (section.label === 'Groceries' && record.id) {
            to = `/customer/products/${record.id}`;
          } else if (role === 'Customer' && section.label === 'Requests' && record.id) {
            to = `/customer/requests/${record.id}`;
          }
          matchingResults.push({
            section: section.label,
            title: getRecordTitle(record),
            description: getRecordDescription(record, searchTerm),
            to,
          });
        }
      });
    });

    const uniqueResults = Array.from(
      new Map(matchingResults.map((result) => [
        `${result.section}-${result.title}-${result.description}-${result.to}`,
        result,
      ])).values()
    );
    setResults(uniqueResults.slice(0, 12));
    if (failedSections.length > 0) {
      setSearchError(`Could not search: ${failedSections.join(', ')}. Please try again.`);
    } else if (matchingResults.length === 0) {
      setSearchError(`No matches found for "${searchTerm}".`);
    }
    setSearching(false);
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setResults([]);
    setSearchError('');
  };

  return (
    <header className="min-h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between gap-3">
      <div className="flex items-center flex-1 min-w-0">
        <button
          onClick={openMobile}
          className="p-2 rounded-xl text-slate-600 hover:text-navy-900 hover:bg-slate-100 lg:hidden focus:outline-none"
          aria-label="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {SEARCH_SECTIONS[role] && (
          <div className="relative w-full max-w-xl ml-2 lg:ml-0">
            <form onSubmit={handleSearch} className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={`Search all ${role} information...`}
                aria-label={`Search all ${role} information`}
                className="w-full pl-9 pr-20 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-teal-500 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    closeSearch();
                  }}
                  aria-label="Clear search"
                  className="absolute right-11 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                disabled={searching}
                className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {searching ? <LoaderCircle className="w-3 h-3 animate-spin" /> : 'Search'}
              </button>
            </form>
            {isSearchOpen && (searching || results.length > 0 || searchError) && (
              <div className="absolute left-0 right-0 top-full mt-2 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {searching && (
                  <p className="px-3 py-4 text-xs text-slate-500">Searching your portal...</p>
                )}
                {!searching && searchError && (
                  <p role="status" className={`px-3 py-3 text-xs ${results.length ? 'text-amber-700' : 'text-slate-500'}`}>
                    {searchError}
                  </p>
                )}
                {results.map((result, index) => (
                  <Link
                    key={`${result.section}-${result.title}-${index}`}
                    to={result.to}
                    onClick={closeSearch}
                    className="block rounded-xl px-3 py-2.5 hover:bg-slate-50"
                  >
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-teal-700">{result.section}</span>
                    <span className="block truncate text-xs font-bold text-slate-800">{result.title}</span>
                    <span className="block truncate text-[11px] text-slate-500">{result.description}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-3">
        {/* Real-time Notifications Dropdown */}
        <NotificationDropdown />

        <div className="h-6 w-px bg-slate-200 mx-1"></div>

        {/* User Info Capsule */}
        <div className="flex items-center space-x-2.5 pl-1">
          <div className="w-8 h-8 rounded-full bg-navy-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{user?.full_name}</p>
            <p className="text-[11px] font-semibold text-teal-600">{role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
