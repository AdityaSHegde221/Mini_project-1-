import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, LogIn, ArrowLeft } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-navy-700 border-t-teal-500 rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-600">Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const rolePrefix = allowedRoles ? allowedRoles[0].toLowerCase() : 'customer';
    return <Navigate to={`/login/${rolePrefix}`} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-red-100 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h2>
          <p className="text-slate-600 text-sm mb-6">
            Your current logged-in role is <span className="font-semibold text-navy-800">[{user.role}]</span>. 
            This portal is strictly reserved for users with role(s): <span className="font-semibold text-navy-800">[{allowedRoles.join(', ')}]</span>.
          </p>
          <div className="flex flex-col space-y-3">
            <Link
              to={`/${user.role.toLowerCase()}/home`}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-navy-800 text-white font-medium rounded-xl hover:bg-navy-900 transition shadow"
            >
              Go to My {user.role} Portal
            </Link>
            <Link
              to="/"
              className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Return to Main Landing Page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
