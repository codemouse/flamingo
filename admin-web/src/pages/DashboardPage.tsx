import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUsers } from '../api/admin';
import type { AdminUser } from '../types/user';
import StatsCards from '../components/StatsCards';
import UsersTable from '../components/UsersTable';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    getUsers()
      .then(setUsers)
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleUserUpdated = (updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  };

  const handleLogout = () => { signOut(); navigate('/login'); };

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
            <span className="dashboard-user">Signed in as <strong>{user?.username}</strong></span>
            <button className="btn btn-ghost" onClick={handleLogout}>Sign Out</button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <h2>User Management</h2>
            <p className="text-muted">View and manage all Flamingo users, roles, and Yodlee account assignments.</p>
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
                  <button className="btn btn-ghost btn-sm" onClick={fetchUsers}>↻ Refresh</button>
                </div>
                <UsersTable users={users} onUserUpdated={handleUserUpdated} />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
