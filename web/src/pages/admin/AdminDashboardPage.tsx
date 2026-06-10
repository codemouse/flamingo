import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../contexts/AuthContext";
import { getUsers } from "../../api/admin";
import type { AdminUser } from "../../types/admin";
import StatsCards from "../../components/admin/StatsCards";
import UsersTable from "../../components/admin/UsersTable";
import PlaidItemsTable from "../../components/admin/PlaidItemsTable";

export default function AdminDashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: users = [],
    isLoading: loading,
    isError,
  } = useQuery({ queryKey: ["admin", "users"], queryFn: getUsers });

  const error = isError ? "Failed to load users." : "";
  const fetchUsers = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const handleUserUpdated = (updated: AdminUser) => {
    queryClient.setQueryData<AdminUser[]>(["admin", "users"], (prev) =>
      (prev ?? []).map((u) => (u.id === updated.id ? updated : u)),
    );
  };

  const handleLogout = () => {
    signOut();
    navigate("/login");
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-brand">
            <span className="dashboard-brand-icon">🦩</span>
            <span className="dashboard-brand-name">Flamingo</span>
            <span className="admin-badge">Admin</span>
          </div>
          <div className="dashboard-header-right">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate("/dashboard")}
            >
              My Dashboard
            </button>
            <span className="dashboard-user">
              Signed in as <strong>{user?.username}</strong>
            </span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <h2>User Management</h2>
            <p className="text-muted">
              View and manage all Flamingo users, their roles, and linked Plaid
              Items.
            </p>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <span className="text-muted">Loading users…</span>
            </div>
          ) : error ? (
            <div className="alert alert-error">{error}</div>
          ) : (
            <>
              <StatsCards users={users} />

              <section>
                <div className="section-header">
                  <h3 className="section-title">All Users</h3>
                  <button className="btn btn-ghost btn-sm" onClick={fetchUsers}>
                    ↻ Refresh
                  </button>
                </div>
                <UsersTable users={users} onUserUpdated={handleUserUpdated} />
              </section>

              <PlaidItemsTable users={users} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
