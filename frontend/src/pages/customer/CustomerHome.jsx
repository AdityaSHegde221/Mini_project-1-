import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { ArrowRight, Search } from 'lucide-react';

const CATEGORY_IMAGES = {
  'Flours & Atta': 'photo-1574323347407-f5e1ad6d020b',
  'Rice & Grains': 'photo-1586201375761-83865001e31c',
  'Dals & Pulses': 'photo-1515543237350-b3eea1ec8082',
  'Edible Oils & Ghee': 'photo-1474979266404-7eaacbcd87c5',
  'Sugar & Salt': 'photo-1587049352851-8d4e89133924',
  'Spices & Masalas': 'photo-1596040033229-a9821ebd058d',
  'Beverages & Tea': 'photo-1544787219-7f47ccb76574',
  'Snacks & Breakfast': 'photo-1621939514649-280e2aa943da',
  Vegetables: 'photo-1540420773420-3366772f4999',
  Fruits: 'photo-1619566636858-adf3ef46400b',
  Dairy: 'photo-1563636619-e9143da7973b',
  Bakery: 'photo-1509440159596-0249088772ff',
};

const getProductImage = (category) => {
  const photoId = CATEGORY_IMAGES[category] || 'photo-1540420773420-3366772f4999';
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=640&q=80`;
};

export const CustomerHome = () => {
  const [products, setProducts] = useState([]);
  const [productQuery, setProductQuery] = useState('');
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/customer/products');
        setProducts(response.data.products || []);
      } catch (error) {
        setProductsError(error.response?.data?.message || 'Could not load groceries right now.');
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.category} ${product.description || ''}`
      .toLowerCase()
      .includes(productQuery.trim().toLowerCase())
  );
  return (
    <div className="space-y-8">
      <section aria-labelledby="grocery-catalog-heading">
        <div className="mb-4">
          <h1 id="grocery-catalog-heading" className="text-2xl font-black text-slate-900">Groceries</h1>
          <p className="mt-1 text-sm text-slate-500">Search groceries, compare shops, place orders, or request more stock.</p>
        </div>

        <label className="relative mb-4 block">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="Search for a grocery..."
            aria-label="Search for a grocery"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        {productsError && <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{productsError}</p>}
        {productsLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading groceries...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            {products.length === 0 ? 'No groceries are currently available.' : 'No groceries match your search.'}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/customer/products/${product.id}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:rounded-2xl"
              >
                <div className="h-20 overflow-hidden bg-emerald-50 sm:h-28 lg:h-32">
                  <img
                    src={getProductImage(product.category)}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="p-2 sm:p-3">
                  <h2 className="line-clamp-2 min-h-8 text-[11px] font-bold leading-4 text-slate-800 sm:text-sm">{product.name}</h2>
                  <p className="mt-1 truncate text-[9px] font-medium text-slate-500 sm:text-xs">{product.category} · {product.unit}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 sm:text-xs">
                    Compare <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 sm:flex sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Your orders and requests</h2>
          <p className="mt-1 text-xs text-slate-600">View order IDs, shop names, and status in one place.</p>
        </div>
        <Link to="/customer/requests" className="mt-3 inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-800 sm:mt-0">
          My Orders & Requests <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </div>
  );
};

export default CustomerHome;
