import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Building2, DollarSign } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const fieldClass = 'w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-sm text-white outline-none focus:border-teal-500';

const RegisterStaffPage = ({ role }) => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const isShopkeeper = role === 'Shopkeeper';
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    organization: '',
    branch: 'Main Branch',
    address: '',
    employeeCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        role,
        fullName: values.fullName,
        phone: values.phone,
        profileData: isShopkeeper
          ? {
            storeName: values.organization,
            branch: values.branch,
            address: values.address,
          }
          : { employeeCode: values.employeeCode },
      });
      navigate(`/${role.toLowerCase()}/home`);
    } catch (registrationError) {
      setError(registrationError.response?.data?.message || `${role} registration failed.`);
    } finally {
      setLoading(false);
    }
  };

  const Icon = isShopkeeper ? Building2 : DollarSign;
  const accountType = isShopkeeper ? 'Shopkeeper' : 'Finance';
  const organizationLabel = isShopkeeper ? 'Store name' : 'Employee code';
  const organizationName = isShopkeeper ? 'organization' : 'employeeCode';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-950/90 p-8 shadow-2xl">
        <Link to={`/login/${role.toLowerCase()}`} className="mb-6 inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to {accountType} Login
        </Link>
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-600 text-white">
            <Icon className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">{accountType} Registration</h1>
          <p className="mt-1 text-xs text-slate-400">Create your {accountType.toLowerCase()} portal account.</p>
        </div>
        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-400">
              Full name
              <input required name="fullName" value={values.fullName} onChange={handleChange} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="text-xs font-semibold text-slate-400">
              Email
              <input required type="email" name="email" value={values.email} onChange={handleChange} className={`${fieldClass} mt-1.5`} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-400">
              Password
              <input required type="password" minLength="8" name="password" value={values.password} onChange={handleChange} className={`${fieldClass} mt-1.5`} />
            </label>
            <label className="text-xs font-semibold text-slate-400">
              Phone
              <input name="phone" value={values.phone} onChange={handleChange} className={`${fieldClass} mt-1.5`} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-semibold text-slate-400">
              {organizationLabel}
              <input required name={organizationName} value={values[organizationName]} onChange={handleChange} className={`${fieldClass} mt-1.5`} />
            </label>
            {isShopkeeper ? (
              <label className="text-xs font-semibold text-slate-400">
                Branch
                <input required name="branch" value={values.branch} onChange={handleChange} className={`${fieldClass} mt-1.5`} />
              </label>
            ) : null}
          </div>
          {isShopkeeper && (
            <label className="block text-xs font-semibold text-slate-400">
              Store address
              <textarea name="address" rows="2" value={values.address} onChange={handleChange} className={`${fieldClass} mt-1.5 resize-y`} />
            </label>
          )}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-teal-500 py-3 text-sm font-bold text-white transition hover:bg-teal-600 disabled:opacity-50">
            {loading ? 'Creating account...' : `Register ${accountType}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterStaffPage;
