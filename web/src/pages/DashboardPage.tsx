import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyAccounts, getMyTransactions } from '../api/yodlee';
import type { YodleeAccount, YodleeTransaction } from '../types/yodlee';
import { NetWorthBanner } from '../components/NetWorthBanner';
import { AccountsGrid } from '../components/AccountsGrid';
import { AccountsManager } from '../components/AccountsManager';
import { TransactionsTable } from '../components/TransactionsTable';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<YodleeAccount[]>([]);
  const [transactions, setTransactions] = useState<YodleeTransaction[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingTxns, setLoadingTxns] = useState(true);
  const [accountError, setAccountError] = useState('');

  const loadAccounts = useCallback(() => {
    setLoadingAccounts(true);
    setAccountError('');
    getMyAccounts()
      .then(setAccounts)
      .catch(() => setAccountError('Failed to load accounts. Please try again.'))
      .finally(() => setLoadingAccounts(false));
  }, []);

  useEffect(() => {
    loadAccounts();

    getMyTransactions()
      .then(setTransactions)
      .finally(() => setLoadingTxns(false));
  }, [loadAccounts]);

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-brand">
            <span className="dashboard-brand-icon">🦩</span>
            <span className="dashboard-brand-name">Flamingo</span>
          </div>
          <div className="dashboard-header-right">
            <span className="dashboard-user">👤 {user?.username}</span>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-welcome">
            <h2>Good to see you, <strong>{user?.username}</strong></h2>
            <p className="text-muted">Here's a snapshot of your financial accounts.</p>
          </div>

          {loadingAccounts ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading your accounts…</p>
            </div>
          ) : accountError ? (
            <div className="alert alert-error">{accountError}</div>
          ) : (
            <>
              <NetWorthBanner accounts={accounts} />
              <AccountsGrid accounts={accounts} />
            </>
          )}

          <AccountsManager accounts={accounts} onRefresh={loadAccounts} />

          <TransactionsTable transactions={transactions} loading={loadingTxns} />
        </div>
      </main>
    </div>
  );
}
