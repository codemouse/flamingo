import { useState, useEffect, useRef } from 'react';
import type { YodleeAccount } from '../types/yodlee';
import {
  updateMyAccount,
  deleteMyAccount,
  getMyFastLinkToken,
} from '../api/yodlee';

// ── helpers shared with AccountCard ────────────────────────────────────────

const fmt = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

function containerLabel(container: string, accountType: string) {
  if (container === 'creditCard') return 'Credit Card';
  if (accountType === 'SAVINGS') return 'Savings';
  if (accountType === 'CHECKING') return 'Checking';
  return accountType || container;
}

function containerIcon(container: string, accountType: string) {
  if (container === 'creditCard') return '💳';
  if (accountType === 'SAVINGS') return '🏦';
  if (accountType === 'CHECKING') return '🏧';
  if (container === 'investment') return '📈';
  return '🏦';
}

// ── FastLink modal ──────────────────────────────────────────────────────────

interface FastLinkModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function FastLinkModal({ onClose, onSuccess }: FastLinkModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const closedRef = useRef(false);

  useEffect(() => {
    closedRef.current = false;

    getMyFastLinkToken()
      .then(({ accessToken, fastLinkUrl }) => {
        if (closedRef.current) return;

        const loadScript = (): Promise<void> =>
          new Promise((resolve, reject) => {
            if ((window as { fastlink?: unknown }).fastlink) { resolve(); return; }
            const s = document.createElement('script');
            s.src = 'https://cdn.yodlee.com/fastlink/v4/initialize.js';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => reject(new Error('Failed to load FastLink SDK'));
            document.head.appendChild(s);
          });

        loadScript()
          .then(() => {
            if (closedRef.current) return;
            setLoading(false);
            (window as { fastlink?: { open: (cfg: unknown, id: string) => void } }).fastlink?.open(
              {
                fastLinkURL: fastLinkUrl,
                accessToken: `Bearer ${accessToken}`,
                params: { configName: 'Aggregation' },
                onSuccess: () => { if (!closedRef.current) onSuccess(); },
                onError: (err: unknown) => {
                  console.error('FastLink error', err);
                  if (!closedRef.current) setError('FastLink encountered an error. Please try again.');
                },
                onClose: () => { if (!closedRef.current) onClose(); },
                onEvent: () => {},
              },
              'yodlee-fastlink-container',
            );
          })
          .catch(() => {
            if (!closedRef.current) {
              setError('Failed to load the bank connection widget.');
              setLoading(false);
            }
          });
      })
      .catch(() => {
        if (!closedRef.current) {
          setError('Failed to get connection token. Make sure you are logged in.');
          setLoading(false);
        }
      });

    return () => {
      closedRef.current = true;
      try {
        (window as { fastlink?: { close: () => void } }).fastlink?.close();
      } catch { /* ignore */ }
    };
  }, [onClose, onSuccess]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Connect a Bank</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {loading && !error && (
          <div className="modal-loading">
            <div className="spinner" />
            <p>Loading bank connection…</p>
          </div>
        )}

        {error && (
          <div className="alert alert-error" style={{ margin: '1rem' }}>{error}</div>
        )}

        <div id="yodlee-fastlink-container" style={{ minHeight: loading ? 0 : 580 }} />
      </div>
    </div>
  );
}

// ── AccountsManager ─────────────────────────────────────────────────────────

interface Props {
  accounts: YodleeAccount[];
  onRefresh: () => void;
}

export function AccountsManager({ accounts, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showFastLink, setShowFastLink] = useState(false);
  const [error, setError] = useState('');

  const startEdit = (a: YodleeAccount) => {
    setEditingId(a.id);
    setEditValue(a.accountName);
    setDeletingId(null);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (editingId == null || !editValue.trim()) return;
    setSaving(true);
    setError('');
    try {
      await updateMyAccount(editingId, { nickname: editValue.trim() });
      setEditingId(null);
      onRefresh();
    } catch {
      setError('Failed to update account name.');
    } finally {
      setSaving(false);
    }
  };

  const startDelete = (id: number) => {
    setDeletingId(id);
    setEditingId(null);
    setError('');
  };

  const confirmDelete = async () => {
    if (deletingId == null) return;
    setDeleting(true);
    setError('');
    try {
      await deleteMyAccount(deletingId);
      setDeletingId(null);
      onRefresh();
    } catch {
      setError('Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  const handleFastLinkSuccess = () => {
    setShowFastLink(false);
    onRefresh();
  };

  return (
    <div className="acct-mgr-card">
      <div className="acct-mgr-header">
        <div className="acct-mgr-header-left">
          <span className="section-title">Manage Accounts</span>
          {error && <span className="acct-mgr-error">{error}</span>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowFastLink(true)}>
          + Connect a Bank
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="acct-mgr-empty">
          No accounts connected yet.{' '}
          <button className="link" style={{ background: 'none', border: 'none', padding: 0 }} onClick={() => setShowFastLink(true)}>
            Connect a bank
          </button>{' '}
          to get started.
        </div>
      ) : (
        <div className="acct-mgr-table-wrap">
          <table className="acct-mgr-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th>Balance</th>
                <th>Provider</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className={deletingId === a.id ? 'acct-mgr-row--deleting' : ''}>
                  {/* Account name cell */}
                  <td className="acct-mgr-name-cell">
                    <span className="acct-mgr-icon">
                      {containerIcon(a.CONTAINER, a.accountType)}
                    </span>
                    {editingId === a.id ? (
                      <div className="acct-mgr-edit-row">
                        <input
                          className="field-input acct-mgr-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          autoFocus
                        />
                        <button
                          className="btn btn-primary acct-mgr-btn-sm"
                          onClick={saveEdit}
                          disabled={saving || !editValue.trim()}
                        >
                          {saving ? '…' : 'Save'}
                        </button>
                        <button
                          className="btn btn-ghost acct-mgr-btn-sm"
                          onClick={cancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="acct-mgr-name">{a.accountName}</span>
                    )}
                  </td>

                  {/* Type */}
                  <td className="acct-mgr-meta">
                    {containerLabel(a.CONTAINER, a.accountType)}
                    {a.accountNumber && (
                      <span className="acct-mgr-number"> ···{a.accountNumber.slice(-4)}</span>
                    )}
                  </td>

                  {/* Balance */}
                  <td className={`acct-mgr-balance ${a.isAsset ? 'positive' : 'negative'}`}>
                    {fmt(a.balance.amount, a.balance.currency)}
                  </td>

                  {/* Provider */}
                  <td className="acct-mgr-meta">{a.providerName}</td>

                  {/* Actions */}
                  <td className="acct-mgr-actions-cell">
                    {deletingId === a.id ? (
                      <div className="acct-mgr-confirm">
                        <span className="acct-mgr-confirm-label">Delete?</span>
                        <button
                          className="btn btn-danger acct-mgr-btn-sm"
                          onClick={confirmDelete}
                          disabled={deleting}
                        >
                          {deleting ? '…' : 'Yes, delete'}
                        </button>
                        <button
                          className="btn btn-ghost acct-mgr-btn-sm"
                          onClick={() => setDeletingId(null)}
                          disabled={deleting}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="acct-mgr-actions">
                        <button
                          className="acct-mgr-icon-btn"
                          onClick={() => startEdit(a)}
                          title="Rename account"
                          disabled={editingId != null}
                        >
                          ✏️
                        </button>
                        <button
                          className="acct-mgr-icon-btn acct-mgr-icon-btn--danger"
                          onClick={() => startDelete(a.id)}
                          title="Delete account"
                          disabled={editingId != null}
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showFastLink && (
        <FastLinkModal
          onClose={() => setShowFastLink(false)}
          onSuccess={handleFastLinkSuccess}
        />
      )}
    </div>
  );
}
