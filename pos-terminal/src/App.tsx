import React from 'react';
// Main App Component
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import POS from './pages/POS';
import Login from './pages/Login';
import VerifyTicket from './pages/VerifyTicket';
import AdminDashboard from './pages/AdminDashboard';
import Accounts from './pages/Accounts';

function PrivateRoute({ children, role }: { children: React.ReactNode, role?: string }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    // If user is admin but tries to go to POS - maybe allow? or separate?
    // If user is pos but tries to go to Admin - definitely block.
    if (role === 'admin' && user.role !== 'admin') {
      return <Navigate to="/pos" replace />;
    }
  }

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/pos"
          element={
            <PrivateRoute>
              <POS />
            </PrivateRoute>
          }
        />
        <Route
          path="/verify"
          element={
            <PrivateRoute>
              <VerifyTicket />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <PrivateRoute role="admin">
              <Accounts />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/pos" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
