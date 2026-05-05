/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

// Pages
import SuperAdminDashboard from "./pages/superAdmin/SuperAdminDashboard";
import CentersList from "./pages/superAdmin/CentersList";
import CenterDetail from "./pages/superAdmin/CenterDetail";
import GlobalStats from "./pages/superAdmin/GlobalStats";
import Login from "./pages/Login";

export default function App() {
  return (
    <Router basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/super-admin" replace />} />
          
          <Route path="/login" element={<Login />} />

          {/* Super Admin Protected Routes */}
          <Route element={<ProtectedRoute roles={["SUPER_ADMIN"]} />}>
            <Route element={<Layout />}>
              <Route path="/super-admin" element={<SuperAdminDashboard />} />
              <Route path="/super-admin/centers" element={<CentersList />} />
              <Route path="/super-admin/centers/:id" element={<CenterDetail />} />
              <Route path="/super-admin/stats" element={<GlobalStats />} />
              <Route path="/settings" element={
                <div className="flex h-64 items-center justify-center text-gray-400 italic">
                  Sozlamalar bo'limi hali tayyor emas
                </div>
              } />
            </Route>
          </Route>

          {/* Regular Admin Dashboard Placeholder */}
          <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={
                <div className="flex h-64 items-center justify-center text-gray-400 italic">
                  Admin Dashboard (Tizimda SUPER_ADMIN ro'li bilan kiring)
                </div>
              } />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/super-admin" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
