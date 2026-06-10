import { useQueryClient } from "@tanstack/react-query";
import type { PlaidAccount } from "../types/plaid";
import { removeItem } from "../api/plaid";
import { fmt, containerIcon, containerLabel } from "../utils/format";
import { PlaidLinkButton } from "./PlaidLinkButton";
import { useState } from "react";

interface Props {
  accounts: PlaidAccount[];
}

export function AccountsManager({ accounts }: Props) {
  const queryClient = useQueryClient();
  const [unlinking, setUnlinking] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleUnlink = async (_itemId: string, flamingioId: string) => {
    if (
      !confirm("Disconnect this institution? All its accounts will be removed.")
    )
      return;
    setUnlinking(flamingioId);
    setError("");
    try {
      await removeItem(flamingioId);
      void queryClient.invalidateQueries({ queryKey: ["accounts"] });
      void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void queryClient.invalidateQueries({ queryKey: ["items"] });
    } catch {
      setError("Failed to disconnect account. Please try again.");
    } finally {
      setUnlinking(null);
    }
  };

  const handleLinkSuccess = () => {
    void queryClient.invalidateQueries({ queryKey: ["accounts"] });
    void queryClient.invalidateQueries({ queryKey: ["transactions"] });
    void queryClient.invalidateQueries({ queryKey: ["items"] });
  };

  return (
    <div className="acct-mgr-card">
      <div className="acct-mgr-header">
        <div className="acct-mgr-header-left">
          <span className="section-title">Manage Accounts</span>
          {error && <span className="acct-mgr-error">{error}</span>}
        </div>
        <PlaidLinkButton
          onSuccess={handleLinkSuccess}
          label="+ Connect a Bank"
        />
      </div>

      {accounts.length === 0 ? (
        <div className="acct-mgr-empty">
          No accounts connected yet. Use the button above to connect a bank.
        </div>
      ) : (
        <div className="acct-mgr-table-wrap">
          <table className="acct-mgr-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Institution</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => {
                const balance = a.balances.current ?? a.balances.available ?? 0;
                const currency = a.balances.iso_currency_code ?? "USD";
                return (
                  <tr key={a.account_id}>
                    <td className="acct-mgr-name-cell">
                      <span className="acct-mgr-icon">
                        {containerIcon(a.type, a.subtype)}
                      </span>
                      <span className="acct-mgr-name">{a.name}</span>
                      {a.mask && (
                        <span className="acct-mgr-number"> ···{a.mask}</span>
                      )}
                    </td>
                    <td className="acct-mgr-meta">
                      {containerLabel(a.type, a.subtype)}
                    </td>
                    <td>
                      <span
                        className={
                          a.type === "credit" ? "negative" : "positive"
                        }
                      >
                        {fmt(balance, currency)}
                      </span>
                    </td>
                    <td>{a.institutionName ?? "—"}</td>
                    <td>
                      <button
                        className="btn btn-ghost acct-mgr-btn-sm"
                        onClick={() => handleUnlink(a.itemId, a.itemId)}
                        disabled={unlinking === a.itemId}
                      >
                        {unlinking === a.itemId ? "Removing…" : "Disconnect"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
