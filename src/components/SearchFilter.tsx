'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

interface Props {
  groups: string[];
  resultCount: number;
}

export default function SearchFilter({ groups, resultCount }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const sp = new URLSearchParams(params.toString());
      if (value) sp.set(key, value);
      else sp.delete(key);
      router.replace(`/?${sp.toString()}`, { scroll: false });
    },
    [params, router]
  );

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        padding: '1rem 1.5rem',
        marginBottom: '1rem',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.75rem',
        alignItems: 'center',
      }}
    >
      <input
        type="search"
        placeholder="Search questions & answers..."
        defaultValue={params.get('q') ?? ''}
        onChange={e => update('q', e.target.value)}
        style={{
          flex: '1 1 200px',
          padding: '0.5rem 0.75rem',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: '0.875rem',
          outline: 'none',
        }}
      />
      <select
        defaultValue={params.get('group') ?? ''}
        onChange={e => update('group', e.target.value)}
        style={{
          padding: '0.5rem 0.75rem',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          fontSize: '0.875rem',
          background: '#fff',
          cursor: 'pointer',
        }}
      >
        <option value="">All groups</option>
        {groups.map(g => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
      <button
        onClick={() => router.refresh()}
        style={{
          padding: '0.5rem 1rem',
          background: '#4F46E5',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '0.875rem',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Refresh
      </button>
      <span style={{ fontSize: '0.875rem', color: '#6B7280', marginLeft: 'auto' }}>
        {resultCount} question{resultCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
