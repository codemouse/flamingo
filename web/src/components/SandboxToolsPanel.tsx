import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  getMyItems,
  refreshBalances,
  sandboxResetLogin,
  sandboxFireWebhook,
  sandboxCreateTransactions,
} from "../api/plaid";
import type { SandboxWebhookCode } from "../types/plaid";

const WEBHOOK_CODES: SandboxWebhookCode[] = [
  "SYNC_UPDATES_AVAILABLE",
  "DEFAULT_UPDATE",
  "NEW_ACCOUNTS_AVAILABLE",
  "USER_PERMISSION_REVOKED",
  "PENDING_DISCONNECT",
  "LOGIN_REPAIRED",
  "RECURRING_TRANSACTIONS_UPDATE",
];

export function SandboxToolsPanel() {
  const queryClient = useQueryClient();
  const { data: items = [] } = useQuery({
    queryKey: ["items"],
    queryFn: getMyItems,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [selectedWebhook, setSelectedWebhook] = useState<SandboxWebhookCode>(
    "SYNC_UPDATES_AVAILABLE",
  );

  const itemId = selectedItem || items[0]?.id || "";

  const wrap = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setMessage("");
    try {
      await fn();
      setMessage(`✓ ${label} succeeded`);
    } catch (err) {
      setMessage(`✗ ${label} failed: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleRefreshBalances = () =>
    wrap("Refresh balances", async () => {
      await refreshBalances();
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    });

  const handleResetLogin = () =>
    wrap("Reset login", () => sandboxResetLogin(itemId));

  const handleFireWebhook = () =>
    wrap(`Fire ${selectedWebhook}`, () =>
      sandboxFireWebhook(itemId, selectedWebhook),
    );

  const handleCreateTransactions = () => {
    const today = new Date().toISOString().slice(0, 10);
    return wrap("Create custom transactions", async () => {
      await sandboxCreateTransactions(itemId, [
        {
          amount: 12.5,
          date_posted: today,
          date_transacted: today,
          description: "Sandbox Coffee",
        },
        {
          amount: -1500,
          date_posted: today,
          date_transacted: today,
          description: "Sandbox Paycheck",
        },
      ]);
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    });
  };

  return (
    <div className="acct-mgr-card">
      <div className="acct-mgr-header">
        <div className="acct-mgr-header-left">
          <span className="section-title">🧪 Sandbox Tools</span>
          {message && (
            <span style={{ marginLeft: "1rem", fontSize: ".875rem" }}>
              {message}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: ".5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-ghost"
            disabled={!!busy}
            onClick={handleRefreshBalances}
          >
            {busy === "Refresh balances"
              ? "Refreshing…"
              : "Refresh Balances (real-time)"}
          </button>
        </div>

        {items.length > 0 && (
          <>
            <div
              style={{
                display: "flex",
                gap: ".5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label style={{ fontSize: ".875rem", fontWeight: 600 }}>
                Target Item:
              </label>
              <select
                value={itemId}
                onChange={(e) => setSelectedItem(e.target.value)}
                style={{
                  maxWidth: 300,
                  padding: ".5rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm, 6px)",
                  background: "var(--surface)",
                }}
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.institutionName ?? it.itemId} ({it.itemId.slice(0, 12)}
                    …)
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                gap: ".5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-ghost"
                disabled={!!busy || !itemId}
                onClick={handleResetLogin}
              >
                Force ITEM_LOGIN_REQUIRED (test update mode)
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: ".5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={selectedWebhook}
                onChange={(e) =>
                  setSelectedWebhook(e.target.value as SandboxWebhookCode)
                }
                style={{
                  maxWidth: 280,
                  padding: ".5rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm, 6px)",
                  background: "var(--surface)",
                }}
              >
                {WEBHOOK_CODES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-ghost"
                disabled={!!busy || !itemId}
                onClick={handleFireWebhook}
              >
                Fire Webhook
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: ".5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <button
                className="btn btn-ghost"
                disabled={!!busy || !itemId}
                onClick={handleCreateTransactions}
              >
                Inject 2 Sandbox Transactions
              </button>
              <span className="text-muted" style={{ fontSize: ".75rem" }}>
                Only works on Items created with the user_transactions_dynamic
                test user.
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
