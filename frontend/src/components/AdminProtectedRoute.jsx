import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, hasBootstrappedSession } = useAdminAuth();
  const location = useLocation();

  if (loading && !hasBootstrappedSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated && hasBootstrappedSession) {
    // Determine the correct login path based on the current admin path
    const isSystemGateway = location.pathname.startsWith('/system-gateway-x9k');
    const loginPath = isSystemGateway ? '/system-gateway-x9k/login' : '/system-control-x7k9/login';
    return <Navigate to={loginPath} replace state={{ from: location }} />;
  }

  return children;
};

export default AdminProtectedRoute;
