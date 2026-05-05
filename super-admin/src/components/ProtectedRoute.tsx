/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Role } from "../types";

interface ProtectedRouteProps {
  roles?: Role[];
}

export default function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#ec5b13] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    // If not authorized for the specific role, redirect to appropriate dashboard
    if (user.role === "SUPER_ADMIN") return <Navigate to="/super-admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
