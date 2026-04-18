interface Metrics {
  total: number;
  today: number;
  thisWeek: number;
  uniqueGroups: number;
  uniqueReferees: number;
}

interface Props {
  metrics: Metrics;
}

const cards = [
  { key: 'total' as const, label: 'Total Questions' },
  { key: 'today' as const, label: 'Questions Today' },
  { key: 'thisWeek' as const, label: 'This Week' },
  { key: 'uniqueGroups' as const, label: 'Group Chats' },
  { key: 'uniqueReferees' as const, label: 'Unique Referees' },
];

export default function MetricCards({ metrics }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {cards.map(({ key, label }) => (
        <div
          key={key}
          style={{
            background: '#fff',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            padding: '1.25rem 1.5rem',
          }}
        >
          <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '0.4rem', fontWeight: 500 }}>
            {label}
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#4F46E5', lineHeight: 1 }}>
            {metrics[key].toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
