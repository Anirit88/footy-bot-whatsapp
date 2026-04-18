interface Props {
  dayCounts: Record<string, number>;
}

function formatLabel(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

export default function BarChart({ dayCounts }: Props) {
  const labels = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000);
    return d.toISOString().split('T')[0];
  });

  const maxCount = Math.max(...labels.map(d => dayCounts[d] ?? 0), 1);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '1.5rem',
        marginBottom: '1.5rem',
      }}
    >
      <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#111827', marginBottom: '1.25rem' }}>
        Questions — Last 14 Days
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {labels.map(day => {
          const count = dayCounts[day] ?? 0;
          const widthPct = (count / maxCount) * 100;
          return (
            <div key={day} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '44px',
                  flexShrink: 0,
                  fontSize: '0.75rem',
                  color: '#6B7280',
                  textAlign: 'right',
                }}
              >
                {formatLabel(day)}
              </span>
              <div style={{ flex: 1, background: '#F3F4F6', borderRadius: '4px', height: '22px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    background: '#4F46E5',
                    borderRadius: '4px',
                    minWidth: count > 0 ? '4px' : '0',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <span style={{ width: '28px', flexShrink: 0, fontSize: '0.75rem', color: '#374151', fontWeight: 500 }}>
                {count > 0 ? count : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
