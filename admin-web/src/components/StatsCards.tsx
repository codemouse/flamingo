import type { AdminUser } from '../types/user';

interface Props {
  users: AdminUser[];
}

export default function StatsCards({ users }: Props) {
  const total = users.length;
  const admins = users.filter((u) => u.role === 'admin').length;
  const linked = users.filter((u) => !!u.yodleeLoginName).length;
  const unlinked = total - linked;

  const cards = [
    { label: 'Total Users', value: total, icon: '👥', color: 'var(--primary)' },
    { label: 'Admin Users', value: admins, icon: '🛡️', color: 'var(--warning)' },
    { label: 'Yodlee Linked', value: linked, icon: '🔗', color: 'var(--success)' },
    { label: 'Unlinked', value: unlinked, icon: '⚠️', color: 'var(--danger)' },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div key={c.label} className="stat-card">
          <div className="stat-card-icon" style={{ color: c.color }}>{c.icon}</div>
          <div className="stat-card-body">
            <div className="stat-card-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-card-label">{c.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
