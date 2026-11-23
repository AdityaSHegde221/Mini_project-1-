import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LocateFixed,
  MapPin,
  PackageSearch,
  Store
} from 'lucide-react';
import api from '../../services/api';

const distanceInKm = (from, to) => {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude))
    * Math.cos(radians(to.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDate = (date) => {
  if (!date) return 'Not provided';
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const ProductOffers = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [radius, setRadius] = useState('all');
  const [bestMatch, setBestMatch] = useState('all');
  const [priceSort, setPriceSort] = useState('low_to_high');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minStock, setMinStock] = useState('');
  const [maxStock, setMaxStock] = useState('');
  const [quantities, setQuantities] = useState({});
  const [activeOrderOfferId, setActiveOrderOfferId] = useState(null);
  const [submittingOfferId, setSubmittingOfferId] = useState(null);
  const [offerMessages, setOfferMessages] = useState({});

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/customer/products/${productId}/offers`);
        setProduct(response.data.product);
        setOffers(response.data.offers || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load this product and its shop offers.');
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [productId]);

  const useCurrentLocation = () => {
    setLocationError('');
    if (!window.isSecureContext) {
      setLocationError('Your browser only allows location access on HTTPS or localhost. Open the app using localhost or a secure HTTPS address.');
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Location access is unavailable in this browser. Check browser settings or enter coordinates below.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const currentLocation = { latitude: coords.latitude, longitude: coords.longitude };
        setLocation(currentLocation);
        setLatitudeInput(coords.latitude.toFixed(6));
        setLongitudeInput(coords.longitude.toFixed(6));
        setLocating(false);
      },
      (geoError) => {
        const message = geoError.code === geoError.PERMISSION_DENIED
          ? 'Location permission was denied. Allow location for this site in your browser’s site settings, then try again.'
          : geoError.code === geoError.POSITION_UNAVAILABLE
            ? 'Your device could not determine a location. Turn on device location services or enter coordinates below.'
            : 'Location lookup timed out. Check device location services and try again, or enter coordinates below.';
        setLocationError(message);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 300000 }
    );
  };

  const applyManualLocation = (event) => {
    event.preventDefault();
    const latitude = Number(latitudeInput);
    const longitude = Number(longitudeInput);
    if (
      latitudeInput.trim() === ''
      || longitudeInput.trim() === ''
      || !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || latitude < -90
      || latitude > 90
      || longitude < -180
      || longitude > 180
    ) {
      setLocationError('Enter a valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }

    setLocationError('');
    setLocation({ latitude, longitude });
  };

  const offersWithDistance = useMemo(
    () => offers.map((offer) => {
      const hasShopCoordinates = Number.isFinite(Number(offer.latitude))
        && Number.isFinite(Number(offer.longitude))
        && offer.latitude !== null
        && offer.longitude !== null;

      return {
        ...offer,
        distance: location && hasShopCoordinates
          ? distanceInKm(location, {
            latitude: Number(offer.latitude),
            longitude: Number(offer.longitude)
          })
          : null
      };
    }),
    [offers, location]
  );

  const eligibleOffers = useMemo(() => {
    const withinRadius = radius === 'all' || !location
      ? offersWithDistance
      : offersWithDistance.filter((offer) => offer.distance !== null && offer.distance <= Number(radius));

    return withinRadius.filter((offer) => {
      const price = Number(offer.unit_price);
      const stock = Number(offer.available_stock);
      return (minPrice === '' || price >= Number(minPrice))
        && (maxPrice === '' || price <= Number(maxPrice))
        && (minStock === '' || stock >= Number(minStock))
        && (maxStock === '' || stock <= Number(maxStock));
    });
  }, [offersWithDistance, radius, location, minPrice, maxPrice, minStock, maxStock]);

  const filteredOffers = useMemo(() => {
    const activeOffers = eligibleOffers.filter((offer) => !offer.is_expired);
    if (bestMatch === 'nearest_shop') {
      const candidates = activeOffers.filter((offer) => offer.distance !== null);
      if (candidates.length === 0) return [];
      const nearestDistance = Math.min(...candidates.map((offer) => offer.distance));
      return candidates.filter((offer) => offer.distance === nearestDistance);
    }

    return [...eligibleOffers].sort((a, b) => (
      (priceSort === 'high_to_low' ? Number(b.unit_price) - Number(a.unit_price) : Number(a.unit_price) - Number(b.unit_price))
      || (a.distance ?? Number.POSITIVE_INFINITY) - (b.distance ?? Number.POSITIVE_INFINITY)
    ));
  }, [eligibleOffers, bestMatch, priceSort]);

  const missingCoordinatesCount = offersWithDistance.filter((offer) => offer.distance === null).length;
  const activePrices = filteredOffers.filter((offer) => !offer.is_expired).map((offer) => Number(offer.unit_price));
  const bestPrice = activePrices.length > 0 ? Math.min(...activePrices) : null;

  const placeOrder = async (offer) => {
    const quantity = Number(quantities[offer.id] || 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 500) {
      setOfferMessages((current) => ({
        ...current,
        [offer.id]: { error: 'Enter a whole-number quantity from 1 to 500.' }
      }));
      return;
    }

    setSubmittingOfferId(offer.id);
    setOfferMessages((current) => ({ ...current, [offer.id]: null }));
    try {
      const response = await api.post('/customer/retail-orders', {
        productId: Number(productId),
        shopkeeperId: Number(offer.shopkeeper_id),
        quantity,
      });
      if (response.data.order.status === 'Accepted') {
        setOffers((current) => current.map((currentOffer) => (
          currentOffer.id === offer.id
            ? { ...currentOffer, available_stock: response.data.remainingStock }
            : currentOffer
        )));
      }
      setActiveOrderOfferId(null);
      setOfferMessages((current) => ({
        ...current,
        [offer.id]: { order: response.data.order, message: response.data.message }
      }));
    } catch (requestError) {
      setOfferMessages((current) => ({
        ...current,
        [offer.id]: {
          error: requestError.response?.data?.message || 'Could not place the order or send the quantity request. Please try again.'
        }
      }));
    } finally {
      setSubmittingOfferId(null);
    }
  };

  if (loading) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading shop prices...</div>;
  }

  if (error) {
    return <div role="alert" className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <Link to="/customer/home" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-700">
        <ArrowLeft className="h-4 w-4" /> Back to groceries
      </Link>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <PackageSearch className="h-8 w-8" />
            </span>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">{product?.category}</span>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900">{product?.name}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{product?.description}</p>
            </div>
          </div>
        </div>
        <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">
          Choose a shop and enter your quantity. Available stock is reserved when you place an order; larger quantities are sent to the shopkeeper to review.
        </p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-extrabold text-slate-900">Find shops near you</h2>
            <p className="mt-1 text-xs text-slate-500">Use your location or edit the coordinates to compare distance.</p>
          </div>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" /> {locating ? 'Finding location...' : 'Use my current location'}
          </button>
        </div>

        <form onSubmit={applyManualLocation} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-semibold text-slate-600">
            Latitude
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              value={latitudeInput}
              onChange={(event) => setLatitudeInput(event.target.value)}
              placeholder="12.971600"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Longitude
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              value={longitudeInput}
              onChange={(event) => setLongitudeInput(event.target.value)}
              placeholder="77.594600"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <button type="submit" className="self-end rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-800">
            Set location
          </button>
        </form>

        {location && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
            <MapPin className="h-3.5 w-3.5" /> Comparing from {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </p>
        )}
        {locationError && <p role="alert" className="mt-3 text-xs text-rose-700">{locationError}</p>}
      </section>

      <section>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Shop comparison</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{filteredOffers.length} shop{filteredOffers.length === 1 ? '' : 's'} with this grocery</h2>
          </div>
        </div>

        <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-2 xl:grid-cols-4">
          <fieldset className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <legend className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Order by price</legend>
            <select
              value={priceSort}
              onChange={(event) => setPriceSort(event.target.value)}
              aria-label="Sort shops by price"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="low_to_high">Low to high</option>
              <option value="high_to_low">High to low</option>
            </select>
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <legend className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Your price range (₹ / {product?.unit})</legend>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Minimum price"
              aria-label="Minimum price"
              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Maximum price"
              aria-label="Maximum price"
              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-3">
            <legend className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Available quantity</legend>
            <input
              type="number"
              min="0"
              step="1"
              value={minStock}
              onChange={(event) => setMinStock(event.target.value)}
              placeholder="Minimum stock"
              aria-label="Minimum available quantity"
              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
            <input
              type="number"
              min="0"
              step="1"
              value={maxStock}
              onChange={(event) => setMaxStock(event.target.value)}
              placeholder="Maximum stock"
              aria-label="Maximum available quantity"
              className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-emerald-500"
            />
          </fieldset>
          <fieldset className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <legend className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Distance</legend>
            <select
              value={radius}
              onChange={(event) => setRadius(event.target.value)}
              disabled={!location}
              aria-label="Filter shops by distance"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="all">Any distance</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
            {!location && <p className="text-[10px] text-slate-400">Set a location above to filter by distance.</p>}
          </fieldset>
          <fieldset className="space-y-2 rounded-xl border border-slate-200 bg-white p-3">
            <legend className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Best shop</legend>
            <select
              value={bestMatch}
              onChange={(event) => setBestMatch(event.target.value)}
              aria-label="Choose the best shop comparison"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">Show all shops</option>
              <option value="nearest_shop" disabled={!location}>Nearest shop</option>
            </select>
          </fieldset>
        </div>

        {location && radius !== 'all' && missingCoordinatesCount > 0 && (
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
            {missingCoordinatesCount} shop{missingCoordinatesCount === 1 ? '' : 's'} without saved coordinates can’t be included in this distance filter.
          </p>
        )}

        {filteredOffers.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <Store className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-bold text-slate-700">No shops found in this range</p>
            <p className="mt-1 text-xs text-slate-500">Try a wider distance or show all shops.</p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {filteredOffers.map((offer) => (
              <article key={offer.id} className={`rounded-3xl border bg-white p-5 shadow-sm ${offer.is_expired ? 'border-rose-200 opacity-80' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                      <Store className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900">{offer.store_name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">{offer.branch}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{offer.address || 'Shop address not provided'}</p>
                    </div>
                  </div>
                  {bestPrice !== null && Number(offer.unit_price) === bestPrice && !offer.is_expired && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-800">Best price</span>
                  )}
                  {offer.is_expired && (
                    <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-rose-800">Expired</span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shop price</p>
                    <p className="mt-1 text-xl font-black text-slate-900">₹{Number(offer.unit_price).toFixed(2)} <span className="text-xs font-semibold text-slate-500">/ {product?.unit}</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available stock</p>
                    <p className="mt-1 text-sm font-bold text-slate-800">{offer.available_stock} {product?.unit}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock3 className={`mt-0.5 h-4 w-4 ${offer.is_expired ? 'text-rose-500' : 'text-amber-600'}`} />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiry date</p>
                      <p className={`mt-1 text-xs font-bold ${offer.is_expired ? 'text-rose-700' : 'text-slate-800'}`}>{formatDate(offer.expiry_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-sky-600" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</p>
                      <p className="mt-1 text-xs font-bold text-slate-800">{offer.distance === null ? 'Set location' : `${offer.distance.toFixed(1)} km`}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4">
                  {activeOrderOfferId !== offer.id && !offerMessages[offer.id]?.order && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveOrderOfferId(offer.id);
                        setOfferMessages((current) => ({ ...current, [offer.id]: null }));
                      }}
                      disabled={offer.is_expired || Number(offer.available_stock) === 0}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Place order <CheckCircle2 className="h-4 w-4" />
                    </button>
                  )}
                  {activeOrderOfferId === offer.id && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        placeOrder(offer);
                      }}
                      className="space-y-3"
                    >
                      <label className="block text-xs font-bold text-slate-600">
                        How many {product?.unit} do you need?
                        <input
                          type="number"
                          min="1"
                          max="500"
                          step="1"
                          required
                          autoFocus
                          value={quantities[offer.id] ?? '1'}
                          onChange={(event) => {
                            setQuantities((current) => ({ ...current, [offer.id]: event.target.value }));
                            setOfferMessages((current) => ({ ...current, [offer.id]: null }));
                          }}
                          aria-label={`Order quantity from ${offer.store_name}`}
                          className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                      </label>
                      {Number(quantities[offer.id] || 1) > Number(offer.available_stock) ? (
                        <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
                          Only {offer.available_stock} {product?.unit} listed. This quantity will be sent to the shopkeeper as a request.
                        </p>
                      ) : (
                        <p className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-800">
                          {offer.available_stock} {product?.unit} available. Stock will be reserved when you place the order.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveOrderOfferId(null)}
                          className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingOfferId === offer.id}
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {submittingOfferId === offer.id ? 'Placing...' : 'Confirm order'}
                        </button>
                      </div>
                    </form>
                  )}
                  {offerMessages[offer.id]?.error && (
                    <p role="alert" className="mt-2 text-xs text-rose-700">{offerMessages[offer.id].error}</p>
                  )}
                  {offerMessages[offer.id]?.order && (
                    <div role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                      <p className="font-bold">
                        {offerMessages[offer.id].order.status === 'Accepted'
                          ? `Order placed with ${offer.store_name}.`
                          : `Quantity request sent to ${offer.store_name}.`}
                      </p>
                      <p className="mt-1">{offerMessages[offer.id].message}</p>
                      <p className="mt-1">
                        Order {offerMessages[offer.id].order.order_number} · {offerMessages[offer.id].order.quantity} {offerMessages[offer.id].order.unit} · ₹{Number(offerMessages[offer.id].order.total_amount).toFixed(2)}
                      </p>
                      <Link to={`/customer/requests#retail-order-${offerMessages[offer.id].order.id}`} className="mt-2 inline-flex font-bold text-emerald-800 underline">
                        Track in My Orders & Requests
                      </Link>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default ProductOffers;
