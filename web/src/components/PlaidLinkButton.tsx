import { useCallback, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { createLinkToken, exchangeToken } from "../api/plaid";

interface Props {
  onSuccess?: () => void;
  label?: string;
}

/**
 * PlaidLinkButton — opens the Plaid Link flow and exchanges the public_token.
 *
 * Flow:
 *  1. On click: call POST /plaid/me/link-token to get a link_token.
 *  2. Open Plaid Link with the link_token.
 *  3. On Plaid success: call POST /plaid/me/exchange-token with the public_token.
 *  4. Call onSuccess() so the parent can refetch accounts/transactions.
 */
export function PlaidLinkButton({
  onSuccess,
  label = "Connect a Bank Account",
}: Props) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      setLoading(true);
      setError(null);
      try {
        await exchangeToken(publicToken);
        onSuccess?.();
      } catch {
        setError("Failed to link account. Please try again.");
      } finally {
        setLoading(false);
        setLinkToken(null); // reset so a fresh token is fetched next time
      }
    },
    onExit: () => {
      setLinkToken(null);
    },
  });

  const handleClick = useCallback(async () => {
    if (linkToken && ready) {
      open();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await createLinkToken();
      setLinkToken(token);
    } catch {
      setError("Failed to initialise Plaid Link. Please try again.");
      setLoading(false);
    }
  }, [linkToken, ready, open]);

  // Auto-open once the token is set and Plaid Link is ready
  const handleReady = useCallback(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <div className="plaid-link-wrapper">
      <button
        className="btn btn-primary"
        onClick={linkToken && ready ? () => open() : handleClick}
        disabled={loading}
        ref={(el) => {
          // Trigger open as soon as the token arrives and Link is ready
          if (el && linkToken && ready) handleReady();
        }}
      >
        {loading ? "Connecting…" : label}
      </button>
      {error && (
        <p className="alert alert-error" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
