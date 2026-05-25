import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { getMyAccounts, getMyTransactions } from "../api/yodlee";
import { NetWorthBanner } from "../components/NetWorthBanner";
import { AccountsGrid } from "../components/AccountsGrid";
import { AccountsManager } from "../components/AccountsManager";
import { TransactionsTable } from "../components/TransactionsTable";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    isSuccess: accountsLoaded,
    error: accountError,
  } = useQuery({ queryKey: ["accounts"], queryFn: getMyAccounts });

  // Only fetch transactions once accounts have successfully loaded
  const { data: transactions = [], isLoading: loadingTxns } = useQuery({
    queryKey: ["transactions"],
    queryFn: getMyTransactions,
    enabled: accountsLoaded,
  });

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
            <h2>
              Good to see you, <strong>{user?.username}</strong>
            </h2>
            <p className="text-muted">
              Here's a snapshot of your financial accounts.
            </p>
          </div>

          {loadingAccounts ? (
            <div className="loading-state">
              <div className="spinner" />
              <p>Loading your accounts…</p>
            </div>
          ) : accountError ? (
            <div className="alert alert-error">
              Failed to load accounts. Please try again.
            </div>
          ) : (
            <>
              <NetWorthBanner accounts={accounts} />
              <AccountsGrid accounts={accounts} />
            </>
          )}

          <AccountsManager accounts={accounts} />

          <TransactionsTable
            transactions={transactions}
            loading={loadingTxns}
          />
        </div>
      </main>
    </div>
  );
}
