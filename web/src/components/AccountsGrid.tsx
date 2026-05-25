import type { YodleeAccount } from "../types/yodlee";
import { AccountCard } from "./AccountCard";

interface Props {
  accounts: YodleeAccount[];
}

function Section({
  title,
  accounts,
}: {
  title: string;
  accounts: YodleeAccount[];
}) {
  if (accounts.length === 0) return null;
  return (
    <div className="accounts-section">
      <h3 className="accounts-section-title">{title}</h3>
      <div className="accounts-grid">
        {accounts.map((a) => (
          <AccountCard key={a.id} account={a} />
        ))}
      </div>
    </div>
  );
}

export function AccountsGrid({ accounts }: Props) {
  const bankAccounts = accounts.filter((a) => a.container === "bank");
  const creditCards = accounts.filter((a) => a.container === "creditCard");
  const others = accounts.filter(
    (a) => a.container !== "bank" && a.container !== "creditCard",
  );

  return (
    <div className="accounts-sections">
      <Section title="Bank Accounts" accounts={bankAccounts} />
      <Section title="Credit Cards" accounts={creditCards} />
      <Section title="Other Accounts" accounts={others} />
    </div>
  );
}
