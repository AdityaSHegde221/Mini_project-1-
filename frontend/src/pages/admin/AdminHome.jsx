import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  ClipboardList,
  Eye,
  Package,
  Pencil,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  Users,
  UserPlus,
  X
} from 'lucide-react';
import api from '../../services/api';

const tabs = [
  { id: 'overview', label: 'Overview', icon: ShieldCheck },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'shops', label: 'Shops', icon: Store },
  { id: 'products', label: 'Catalog', icon: Package },
  { id: 'listings', label: 'Shop listings', icon: Store },
  { id: 'requests', label: 'Requests', icon: ClipboardList },
  { id: 'orders', label: 'Orders', icon: ShoppingBag }
];

const emptyData = {
  overview: {},
  users: [],
  shops: [],
  products: [],
  listings: [],
  requests: [],
  orders: []
};

const errorText = (error, fallback) => error.response?.data?.message || fallback;
const dateText = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString() : '—';
const moneyText = (value) => `₹${Number(value || 0).toFixed(2)}`;

const AdminHome = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageError, setPageError] = useState('');
  const [notice, setNotice] = useState('');
  const [productEditor, setProductEditor] = useState(null);
  const [listingEditor, setListingEditor] = useState(null);
  const [adminRegistrationOpen, setAdminRegistrationOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setPageError('');
    try {
      const [overview, users, shops, products, listings, requests, orders] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/users'),
        api.get('/admin/shops'),
        api.get('/admin/products'),
        api.get('/admin/listings'),
        api.get('/admin/requests'),
        api.get('/admin/orders')
      ]);
      setData({
        overview: overview.data.overview,
        users: users.data.users,
        shops: shops.data.shops,
        products: products.data.products,
        listings: listings.data.listings,
        requests: requests.data.requests,
        orders: orders.data.orders
      });
    } catch (error) {
      setPageError(errorText(error, 'Could not load Admin data.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    setPageError('');
    setNotice('');
    try {
      await action();
      setNotice(successMessage);
      await loadData();
      return { success: true };
    } catch (error) {
      const message = errorText(error, 'The requested change could not be saved.');
      setPageError(message);
      return { success: false, message };
    } finally {
      setBusy(false);
    }
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const product = {
      name: formData.get('name'),
      category: formData.get('category'),
      unit: formData.get('unit'),
      description: formData.get('description')
    };
    const result = await runAction(
      () => api.put(`/admin/products/${productEditor.id}`, product),
      'Catalog product updated.'
    );
    if (result.success) setProductEditor(null);
    else setModalError(result.message);
  };

  const saveListing = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await runAction(
      () => api.put(`/admin/listings/${listingEditor.id}`, {
        availableStock: formData.get('availableStock'),
        unitPrice: formData.get('unitPrice'),
        expiryDate: formData.get('expiryDate')
      }),
      'Shop listing updated.'
    );
    if (result.success) setListingEditor(null);
    else setModalError(result.message);
  };

  const createAdmin = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await runAction(
      () => api.post('/admin/users', {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        password: formData.get('password')
      }),
      'Admin account created.'
    );
    if (result.success) setAdminRegistrationOpen(false);
    else setModalError(result.message);
  };

  const toggleUser = (user) => runAction(
    () => api.patch(`/admin/users/${user.id}/status`, { isActive: !user.is_active }),
    `${user.full_name}'s account ${user.is_active ? 'deactivated' : 'activated'}.`
  );

  const toggleProduct = (product) => {
    if (product.is_active && !window.confirm(`Delete ${product.name} from the active catalog? Its order history will be preserved.`)) return;
    return runAction(
      () => api.patch(`/admin/products/${product.id}/status`, { isActive: !product.is_active }),
      `${product.name} ${product.is_active ? 'deleted from' : 'restored to'} the active catalog.`
    );
  };

  const removeListing = (listing) => {
    if (!window.confirm(`Remove ${listing.product_name} from ${listing.store_name}?`)) return;
    runAction(
      () => api.delete(`/admin/listings/${listing.id}`),
      `${listing.product_name} listing removed from ${listing.store_name}.`
    );
  };

  const overviewCards = [
    { label: 'User accounts', value: data.overview.user_count, icon: Users, tone: 'blue' },
    { label: 'Shops', value: data.overview.shop_count, icon: Store, tone: 'teal' },
    { label: 'Active products', value: data.overview.active_product_count, icon: Package, tone: 'emerald' },
    { label: 'Shop listings', value: data.overview.shop_listing_count, icon: Archive, tone: 'amber' },
    { label: 'Requests', value: data.overview.request_count, icon: ClipboardList, tone: 'violet' },
    { label: 'Orders', value: data.overview.order_count, icon: ShoppingBag, tone: 'rose' }
  ];
  const toneClasses = {
    blue: 'bg-blue-50 text-blue-700',
    teal: 'bg-teal-50 text-teal-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    violet: 'bg-violet-50 text-violet-700',
    rose: 'bg-rose-50 text-rose-700'
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Platform administration</p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Admin console</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Manage user access, the shared grocery catalog, and shop listings. Requests and orders are read-only.
        </p>
      </header>

      {pageError && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {pageError}
        </div>
      )}
      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {notice}
        </div>
      )}

      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${
              activeTab === id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading administration data...</div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {overviewCards.map(({ label, value, icon: Icon, tone }) => (
                <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500">{label}</span>
                    <span className={`rounded-xl p-2 ${toneClasses[tone]}`}><Icon className="h-5 w-5" /></span>
                  </div>
                  <p className="mt-4 text-3xl font-black text-slate-900">{value ?? '—'}</p>
                </article>
              ))}
            </section>
          )}

          {activeTab === 'users' && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Admin accounts are created by an authenticated Admin.</p>
                <button
                  type="button"
                  onClick={() => { setModalError(''); setAdminRegistrationOpen(true); }}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <UserPlus className="h-4 w-4" /> Register Admin
                </button>
              </div>
              <DataTable columns={['Name', 'Email', 'Role', 'Shop', 'Status', 'Action']}>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{user.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{user.email}</td>
                    <td className="px-4 py-3">{user.role}</td>
                    <td className="px-4 py-3 text-slate-600">{user.store_name ? `${user.store_name}${user.branch ? ` · ${user.branch}` : ''}` : '—'}</td>
                    <td className="px-4 py-3"><StatusBadge active={user.is_active} /></td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => toggleUser(user)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </section>
          )}

          {activeTab === 'shops' && (
            <DataTable columns={['Shop', 'Owner', 'Address', 'Location', 'Listings', 'Account', 'Action']}>
              {data.shops.map((shop) => (
                <tr key={shop.user_id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{shop.store_name}<span className="block text-xs font-normal text-slate-500">{shop.branch}</span></td>
                  <td className="px-4 py-3">{shop.owner_name}<span className="block text-xs text-slate-500">{shop.owner_email}</span></td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">{shop.address || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">{shop.latitude != null && shop.longitude != null ? `${Number(shop.latitude).toFixed(4)}, ${Number(shop.longitude).toFixed(4)}` : 'Not set'}</td>
                  <td className="px-4 py-3">{shop.listing_count}</td>
                  <td className="px-4 py-3"><StatusBadge active={shop.is_active} /></td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleUser({ id: shop.user_id, full_name: shop.owner_name, is_active: shop.is_active })}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {shop.is_active ? 'Disable shop' : 'Enable shop'}
                    </button>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}

          {activeTab === 'products' && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3 p-4">
                <div>
                  <h2 className="font-black text-slate-900">Shared product catalog</h2>
                  <p className="mt-1 text-xs text-slate-500">Only Admin can delete catalog products. Deletion hides them from new listings while preserving order history.</p>
                </div>
              </div>
              <DataTable columns={['Product', 'Category', 'Unit', 'Shops', 'Status', 'Actions']}>
                {data.products.map((product) => (
                  <tr key={product.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-slate-600">{product.category}</td>
                    <td className="px-4 py-3">{product.unit}</td>
                    <td className="px-4 py-3">{product.shop_count}</td>
                    <td className="px-4 py-3"><StatusBadge active={product.is_active} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button type="button" disabled={busy} onClick={() => { setModalError(''); setProductEditor(product); }} title="Edit product" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button type="button" disabled={busy} onClick={() => toggleProduct(product)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50 ${product.is_active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                          {product.is_active ? 'Delete' : 'Restore'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </section>
          )}

          {activeTab === 'listings' && (
            <DataTable columns={['Shop', 'Product', 'Stock', 'Price', 'Expiry', 'Catalog', 'Actions']}>
              {data.listings.map((listing) => (
                <tr key={listing.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{listing.store_name}<span className="block text-xs font-normal text-slate-500">{listing.branch}</span></td>
                  <td className="px-4 py-3">{listing.product_name}</td>
                  <td className="px-4 py-3">{listing.available_stock}</td>
                  <td className="px-4 py-3">{moneyText(listing.unit_price)}</td>
                  <td className="px-4 py-3">{dateText(listing.expiry_date)}</td>
                  <td className="px-4 py-3"><StatusBadge active={listing.product_is_active} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" disabled={busy} onClick={() => { setModalError(''); setListingEditor(listing); }} title="Edit listing" className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={busy} onClick={() => removeListing(listing)} title="Remove listing" className="rounded-lg border border-rose-200 p-2 text-rose-700 hover:bg-rose-50 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}

          {activeTab === 'requests' && (
            <DataTable columns={['Request', 'Customer', 'Product', 'Qty', 'Status', 'Created']}>
              {data.requests.map((request) => (
                <tr key={request.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{request.request_code}</td>
                  <td className="px-4 py-3">{request.customer_name}<span className="block text-xs text-slate-500">{request.customer_email}</span></td>
                  <td className="px-4 py-3">{request.product_name}</td>
                  <td className="px-4 py-3">{request.quantity} {request.unit}</td>
                  <td className="px-4 py-3">{request.status}</td>
                  <td className="px-4 py-3">{dateText(request.created_at)}</td>
                </tr>
              ))}
            </DataTable>
          )}

          {activeTab === 'orders' && (
            <DataTable columns={['PO', 'Product', 'Customer', 'Shop', 'Vendor', 'Total', 'Status']}>
              {data.orders.map((order) => (
                <tr key={order.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-semibold text-slate-900">{order.po_number}</td>
                  <td className="px-4 py-3">{order.product_name}<span className="block text-xs text-slate-500">Qty {order.quantity}</span></td>
                  <td className="px-4 py-3">{order.customer_name}</td>
                  <td className="px-4 py-3">{order.store_name}</td>
                  <td className="px-4 py-3">{order.vendor_name}</td>
                  <td className="px-4 py-3">{moneyText(order.total_amount)}</td>
                  <td className="px-4 py-3">{order.status}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </>
      )}

      {productEditor && (
        <EditorModal title="Edit catalog product" onClose={() => setProductEditor(null)}>
          <form onSubmit={saveProduct} className="space-y-4">
            <FormField label="Product name" name="name" defaultValue={productEditor.name} required maxLength={255} />
            <FormField label="Category" name="category" defaultValue={productEditor.category} required maxLength={100} />
            <FormField label="Unit" name="unit" defaultValue={productEditor.unit} required maxLength={50} placeholder="e.g. 1 kg" />
            <label className="block text-xs font-bold text-slate-700">
              Description
              <textarea name="description" defaultValue={productEditor.description || ''} rows="3" maxLength={2000} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
            </label>
            <ModalActions onClose={() => setProductEditor(null)} busy={busy} error={modalError} />
          </form>
        </EditorModal>
      )}

      {listingEditor && (
        <EditorModal title={`Edit ${listingEditor.product_name} listing`} onClose={() => setListingEditor(null)}>
          <form onSubmit={saveListing} className="space-y-4">
            <p className="text-xs text-slate-500">{listingEditor.store_name}{listingEditor.branch ? ` · ${listingEditor.branch}` : ''}</p>
            <FormField label="Available stock" name="availableStock" type="number" min="0" step="1" defaultValue={listingEditor.available_stock} required />
            <FormField label="Unit price (₹)" name="unitPrice" type="number" min="0.01" step="0.01" defaultValue={listingEditor.unit_price} required />
            <FormField label="Expiry date" name="expiryDate" type="date" defaultValue={String(listingEditor.expiry_date).slice(0, 10)} required />
            <ModalActions onClose={() => setListingEditor(null)} busy={busy} error={modalError} />
          </form>
        </EditorModal>
      )}
      {adminRegistrationOpen && (
        <EditorModal title="Register Admin account" onClose={() => setAdminRegistrationOpen(false)}>
          <form onSubmit={createAdmin} className="space-y-4">
            <FormField label="Full name" name="fullName" required maxLength={255} />
            <FormField label="Email" name="email" type="email" required maxLength={255} />
            <FormField label="Temporary password (8+ characters)" name="password" type="password" required minLength={8} />
            <ModalActions onClose={() => setAdminRegistrationOpen(false)} busy={busy} error={modalError} submitLabel="Create Admin" />
          </form>
        </EditorModal>
      )}
    </div>
  );
};

const DataTable = ({ columns, children }) => (
  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="min-w-full text-left text-xs">
      <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
        <tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-4 py-3 font-extrabold">{column}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100 text-slate-700">
        {children}
      </tbody>
    </table>
    {React.Children.count(children) === 0 && <p className="p-8 text-center text-sm text-slate-500">No records found.</p>}
  </div>
);

const StatusBadge = ({ active }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
    {active ? <CheckCircle2 className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
    {active ? 'Active' : 'Inactive'}
  </span>
);

const EditorModal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-black text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close dialog" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const FormField = ({ label, name, ...props }) => (
  <label className="block text-xs font-bold text-slate-700">
    {label}
    <input name={name} {...props} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal outline-none focus:border-emerald-500" />
  </label>
);

const ModalActions = ({ onClose, busy, error, submitLabel = 'Save changes' }) => (
  <>
    {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
      <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
      <button type="submit" disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
        {busy ? 'Saving...' : submitLabel}
      </button>
    </div>
  </>
);

export default AdminHome;
