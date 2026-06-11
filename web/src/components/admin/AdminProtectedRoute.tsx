import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../../contexts/AuthContext";

export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, isHydrating } = useAuth();
  if (isHydrating) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <span className="text-muted">Loading…</span>
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
