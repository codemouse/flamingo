import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { getMyAccounts, getMyTransactions } from "../api/plaid";
import { NetWorthBanner } from "../components/NetWorthBanner";
import { AccountsGrid } from "../components/AccountsGrid";
import { AccountsManager } from "../components/AccountsManager";
import { TransactionsTable } from "../components/TransactionsTable";
import { AuthDetailsPanel } from "../components/AuthDetailsPanel";
import { IdentityPanel } from "../components/IdentityPanel";
import { LiabilitiesPanel } from "../components/LiabilitiesPanel";
import { InvestmentsPanel } from "../components/InvestmentsPanel";
import { SandboxToolsPanel } from "../components/SandboxToolsPanel";
import type { PlaidTransaction } from "../types/plaid";
import type { PlaidTransactionSync } from "../types/plaid";

type TabKey =
  | "overview"
  | "auth"
  | "identity"
  | "liabilities"
  | "investments"
  | "sandbox";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "auth", label: "Auth" },
  { key: "identity", label: "Identity" },
  { key: "liabilities", label: "Liabilities" },
  { key: "investments", label: "Investments" },
  { key: "sandbox", label: "🧪 Sandbox" },
];

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const {
    data: accounts = [],
    isLoading: loadingAccounts,
    isSuccess: accountsLoaded,
    error: accountError,
  } = useQuery({ queryKey: ["accounts"], queryFn: getMyAccounts });

  // Flatten all added transactions across Items for display
  const { data: txnSyncs = [], isLoading: loadingTxns } = useQuery({
    queryKey: ["transactions"],
    queryFn: getMyTransactions,
    enabled: accountsLoaded,
  });

  const transactions: PlaidTransaction[] = (
    txnSyncs as PlaidTransactionSync[]
  ).flatMap((s) => s.added);

  const handleLogout = () => {
    void signOut();
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
            {user?.role === "admin" && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate("/admin")}
              >
                Admin
              </button>
            )}
            <span className="dashboard-user">
              Signed in as <strong>{user?.username}</strong>
            </span>
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
              {accounts.length === 0
                ? "Connect a bank to start tracking your finances."
                : "Here's a snapshot of your financial accounts."}
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
          ) : accounts.length === 0 ? (
            <AccountsManager accounts={accounts} />
          ) : (
            <>
              <NetWorthBanner accounts={accounts} />

              <div
                role="tablist"
                style={{
                  display: "flex",
                  gap: ".5rem",
                  borderBottom: "1px solid var(--border)",
                  margin: "1.5rem 0 1rem",
                  flexWrap: "wrap",
                }}
              >
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={activeTab === t.key}
                    onClick={() => setActiveTab(t.key)}
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom:
                        activeTab === t.key
                          ? "2px solid var(--primary)"
                          : "2px solid transparent",
                      color:
                        activeTab === t.key
                          ? "var(--primary)"
                          : "var(--text-muted)",
                      fontWeight: 600,
                      padding: ".75rem 1rem",
                      cursor: "pointer",
                      fontSize: ".9rem",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === "overview" && (
                <>
                  <AccountsGrid accounts={accounts} />
                  <AccountsManager accounts={accounts} />
                  <TransactionsTable
                    transactions={transactions}
                    loading={loadingTxns}
                  />
                </>
              )}
              {activeTab === "auth" && <AuthDetailsPanel />}
              {activeTab === "identity" && <IdentityPanel />}
              {activeTab === "liabilities" && <LiabilitiesPanel />}
              {activeTab === "investments" && <InvestmentsPanel />}
              {activeTab === "sandbox" && <SandboxToolsPanel />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
