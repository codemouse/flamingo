import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminPlaidItem, AdminUser } from "../../types/admin";
import { getAllPlaidItems, removePlaidItem } from "../../api/admin";

interface Props {
  users: AdminUser[];
}

export default function PlaidItemsTable({ users }: Props) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const usernameById = new Map(users.map((u) => [u.id, u.username]));

  const {
    data: items = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ["admin", "plaid-items"],
    queryFn: getAllPlaidItems,
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => removePlaidItem(id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData<AdminPlaidItem[]>(
        ["admin", "plaid-items"],
        (prev) => (prev ?? []).filter((i) => i.id !== id),
      );
    },
    onError: () => setError("Failed to revoke Item."),
  });

  const fetchItems = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "plaid-items"] });
  const removing = removeMutation.isPending
    ? (removeMutation.variables ?? null)
    : null;
  const displayedError =
    error || (isError ? "Failed to load Plaid Items." : "");

  const handleRemove = (item: AdminPlaidItem) => {
    const owner = usernameById.get(item.userId) ?? item.userId;
    if (
      !confirm(
        `Revoke ${item.institutionName ?? "this Item"} for user "${owner}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    removeMutation.mutate(item.id);
  };

  return (
    <section>
      <div className="section-header">
        <h3 className="section-title">Linked Plaid Items</h3>
        <button className="btn btn-ghost btn-sm" onClick={fetchItems}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <span className="text-muted">Loading Plaid Items…</span>
        </div>
      ) : displayedError ? (
        <div className="alert alert-error">{displayedError}</div>
      ) : items.length === 0 ? (
        <div
          className="table-card"
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          No Plaid Items linked yet.
        </div>
      ) : (
        <div className="table-card">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Institution</th>
                <th>Item ID</th>
                <th>Linked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="cell-username">
                    {usernameById.get(it.userId) ?? (
                      <span className="text-muted">
                        {it.userId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td>
                    {it.institutionName ?? (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td>
                    <code style={{ fontSize: ".78rem" }}>
                      {it.itemId.slice(0, 24)}…
                    </code>
                  </td>
                  <td className="text-muted">
                    {new Date(it.createdAt).toLocaleDateString()}
                  </td>
                  <td className="cell-actions">
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemove(it)}
                      disabled={removing === it.id}
                    >
                      {removing === it.id ? "Revoking…" : "Revoke"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
