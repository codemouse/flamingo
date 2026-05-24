import { useState, useEffect, useCallback } from 'react';
import type { AdminUser } from '../types/user';
import { updateUser, getSandboxPool } from '../api/admin';

interface Props {
  users: AdminUser[];
  onUserUpdated: (u: AdminUser) => void;
}

export default function UsersTable({ users, onUserUpdated }: Props) {
  const [editing, setEditing] = useState<Record<string, { role: 'user' | 'admin'; email: string; yodleeLoginName: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [pool, setPool] = useState<string[]>([]);

  useEffect(() => {
    getSandboxPool().then(setPool).catch(() => {});
  }, []);

  const startEdit = (u: AdminUser) => {
    setEditing((prev) => ({
      ...prev,
      [u.id]: { role: u.role, email: u.email ?? '', yodleeLoginName: u.yodleeLoginName ?? '' },
    }));
  };

  const cancelEdit = (id: string) => {
    setEditing((prev) => { const next = { ...prev }; delete next[id]; return next; });
  };

  const saveEdit = useCallback(async (u: AdminUser) => {
    const draft = editing[u.id];
    if (!draft) return;
    setSaving(u.id);
    try {
      const updated = await updateUser(u.id, {
        role: draft.role,
        email: draft.email.trim() || null,
        yodleeLoginName: draft.yodleeLoginName || null,
      });
      onUserUpdated(updated);
      cancelEdit(u.id);
    } catch {
      // keep editing open on error
    } finally {
      setSaving(null);
    }
  }, [editing, onUserUpdated]);

  return (
    <div className="table-card">
      <table className="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Yodlee Account</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const draft = editing[u.id];
            const isEditing = !!draft;
            const isSaving = saving === u.id;

            return (
              <tr key={u.id} className={isEditing ? 'row-editing' : ''}>
                <td className="cell-username">{u.username}</td>
                <td className="cell-email">
                  {isEditing ? (
                    <input
                      className="inline-input"
                      type="email"
                      value={draft.email}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [u.id]: { ...prev[u.id], email: e.target.value },
                        }))
                      }
                      placeholder="user@example.com"
                    />
                  ) : (
                    u.email ?? <span className="text-muted">—</span>
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <select
                      className="inline-select"
                      value={draft.role}
                      onChange={(e) =>
                        setEditing((prev) => ({
                          ...prev,
                          [u.id]: { ...prev[u.id], role: e.target.value as 'user' | 'admin' },
                        }))
                      }
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  ) : (
                    <span className={`role-badge role-badge--${u.role}`}>{u.role}</span>
                  )}
                </td>
                <td>
                  {isEditing ? (
                    pool.length > 0 ? (
                      <select
                        className="inline-select"
                        value={draft.yodleeLoginName}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [u.id]: { ...prev[u.id], yodleeLoginName: e.target.value },
                          }))
                        }
                      >
                        <option value="">— None —</option>
                        {pool.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="inline-input"
                        value={draft.yodleeLoginName}
                        onChange={(e) =>
                          setEditing((prev) => ({
                            ...prev,
                            [u.id]: { ...prev[u.id], yodleeLoginName: e.target.value },
                          }))
                        }
                        placeholder="loginName or blank"
                      />
                    )
                  ) : u.yodleeLoginName ? (
                    <code className="yodlee-id">{u.yodleeLoginName}</code>
                  ) : (
                    <span className="badge-unlinked">Unlinked</span>
                  )}
                </td>
                <td className="text-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="cell-actions">
                  {isEditing ? (
                    <>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => saveEdit(u)}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => cancelEdit(u.id)}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(u)}>
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
