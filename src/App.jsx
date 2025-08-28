import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import StoreOwnerDashboard from './pages/StoreOwnerDashboard';
import LoadingSpinner from './components/LoadingSpinner';

// This component handles all routing logic based on auth state.
function AppRouter() {
  const { user, loading } = useAuth();

  // 1. Show a loading spinner while the auth state is being determined.
  if (loading) {
    return <LoadingSpinner />;
  }

  // Helper to get the correct dashboard path based on user role.
  const getDashboardPath = (role) => {
    switch (role) {
      case 'admin': return '/admin';
      case 'user': return '/user';
      case 'store_owner': return '/store-owner';
      default: return '/login'; // Fallback in case of an unexpected role
    }
  };

  return (
    <Routes>
      {/* 2. If a user is logged in, render the protected routes. */}
      {user ? (
        <>
          {/* Role-specific dashboard routes */}
          {user.role === 'admin' && <Route path="/admin" element={<AdminDashboard />} />}
          {user.role === 'user' && <Route path="/user" element={<UserDashboard />} />}
          {user.role === 'store_owner' && <Route path="/store-owner" element={<StoreOwnerDashboard />} />}
          
          {/* Redirect from the root path to the user's correct dashboard */}
          <Route path="/" element={<Navigate to={getDashboardPath(user.role)} replace />} />

          {/* A catch-all route to redirect any invalid URL to the user's dashboard */}
          <Route path="*" element={<Navigate to={getDashboardPath(user.role)} replace />} />
        </>
      ) : (
        <>
          {/* 3. If no user is logged in, render the public routes. */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* A catch-all route to redirect any other path to the login page */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <AppRouter />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
