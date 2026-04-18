'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface LogRow {
  id: string;
  question: string;
  answer: string;
  referee_num: string | null;
  group_name: string | null;
  created_at: string;
}

interface Props {
  initialLogs: LogRow[];
  searchQuery: string;
  groupFilter: string;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LogFeed({ initialLogs, searchQuery, groupFilter }: Props) {
  const [logs, setLogs] = useState<LogRow[]>(initialLogs);

  useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel('logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs' },
        payload => {
          setLogs(prev => [payload.new as LogRow, ...prev].slice(0, 500));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = logs.filter(log => {
    const matchesSearch =
      !searchQuery ||
      log.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGroup = !groupFilter || log.group_name === groupFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <div>
      {filtered.length === 0 && (
        <p style={{ color: '#6B7280', textAlign: 'center', padding: '2rem' }}>
          No questions found.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map(log => (
          <div
            key={log.id}
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              padding: '1.25rem 1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.6rem',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                {formatTimestamp(log.created_at)}
              </span>
              {log.group_name && (
                <span
                  style={{
                    background: '#7C3AED',
                    color: '#fff',
                    borderRadius: '9999px',
                    padding: '2px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  {log.group_name}
                </span>
              )}
              {log.referee_num && (
                <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{log.referee_num}</span>
              )}
            </div>
            <p style={{ fontWeight: 700, color: '#111827', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
              {log.question}
            </p>
            <blockquote
              style={{
                borderLeft: '3px solid #4F46E5',
                paddingLeft: '0.85rem',
                margin: 0,
                color: '#374151',
                fontSize: '0.875rem',
                lineHeight: '1.6',
                background: '#EEF2FF',
                borderRadius: '0 6px 6px 0',
                padding: '0.6rem 0.85rem',
              }}
            >
              {log.answer}
            </blockquote>
          </div>
        ))}
      </div>
    </div>
  );
}
