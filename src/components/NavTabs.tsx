'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Dashboard', href: '/' },
  { label: 'Conversations', href: '/chats' },
  { label: 'Knowledge Base', href: '/admin' },
];

export default function NavTabs() {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.75rem' }}>
      {tabs.map(tab => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '6px 6px 0 0',
              fontSize: '0.875rem',
              fontWeight: active ? 600 : 400,
              color: active ? '#4F46E5' : '#C7D2FE',
              background: active ? '#fff' : 'transparent',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
