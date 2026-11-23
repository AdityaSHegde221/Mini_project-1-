import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Store, Mail, MapPin, Building, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

export const ShopkeeperProfile = () => {
  const { user, profile, setProfile } = useAuth();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationFeedback, setLocationFeedback] = useState(null);

  useEffect(() => {
    setLatitude(profile?.latitude ?? '');
    setLongitude(profile?.longitude ?? '');
  }, [profile?.latitude, profile?.longitude]);

  useEffect(() => {
    if (profile) return;

    api.get('/auth/me')
      .then((response) => setProfile(response.data.profile))
      .catch((err) => {
        setLocationFeedback({
          type: 'error',
          message: err.response?.data?.message || 'Could not load your shop profile.'
        });
      });
  }, [profile, setProfile]);

  const saveStoreLocation = async (event) => {
    event.preventDefault();
    setSavingLocation(true);
    setLocationFeedback(null);
    try {
      const response = await api.put('/shopkeeper/store-location', {
        latitude: Number(latitude),
        longitude: Number(longitude)
      });
      setProfile({ ...profile, ...response.data.profile });
      setLocationFeedback({ type: 'success', message: 'Shop location saved for distance comparisons.' });
    } catch (err) {
      setLocationFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Could not save your shop location.'
      });
    } finally {
      setSavingLocation(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm">
        <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-2xl bg-navy-950 text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
            <Store className="w-8 h-8 text-teal-400" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 block">Store Administrator</span>
            <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{user?.full_name}</h1>
            <p className="text-xs text-slate-500 font-medium">{profile?.store_name || 'Central Campus Depot'}</p>
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
            <Building className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Branch / Location</span>
              <span className="font-bold text-slate-800 text-sm">{profile?.branch || 'Bengaluru Main Depot'}</span>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
            <div>
              <span className="text-slate-400 font-semibold block uppercase">Store Address</span>
              <span className="font-medium text-slate-700 leading-relaxed block mt-0.5">
                {profile?.address || 'Industrial Hub Gate 1, Peenya'}
              </span>
            </div>
          </div>

        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-extrabold text-slate-900">Fixed shop location</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Customers use these coordinates to filter grocery offers by distance. Enter the shop’s coordinates, not your personal location. Replace the approximate demo coordinates with your exact location.</p>
          </div>
        </div>

        {locationFeedback && (
          <div role={locationFeedback.type === 'error' ? 'alert' : 'status'} className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs ${locationFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}>
            {locationFeedback.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {locationFeedback.message}
          </div>
        )}

        <form onSubmit={saveStoreLocation} className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-bold text-slate-600">
            Latitude
            <input
              type="number"
              step="any"
              min="-90"
              max="90"
              required
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="12.971600"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Longitude
            <input
              type="number"
              step="any"
              min="-180"
              max="180"
              required
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="77.594600"
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <button type="submit" disabled={savingLocation} className="inline-flex items-center justify-center gap-2 self-end rounded-xl bg-slate-900 px-5 py-3 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
            <Save className="h-4 w-4" /> {savingLocation ? 'Saving...' : 'Save location'}
          </button>
        </form>
      </section>
    </div>
  );
};

export default ShopkeeperProfile;
