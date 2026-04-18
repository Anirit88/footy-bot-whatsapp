'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface LogRow {
  id: string;
  question: string;
  answer: string;
  referee_num: string | null;
  group_name: string | null;
  created_at: string;
}

interface GroupSummary {
  group_name: string;
  last_message: string;
  message_count: number;
}

interface Props {
  groups: GroupSummary[];
  initialMessages: LogRow[];
  selectedGroup: string | null;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatShortName(raw: string | null) {
  if (!raw) return 'Unknown';
  return raw.replace('whatsapp:', '').trim();
}

export default function ChatView({ groups, initialMessages, selectedGroup }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [messages, setMessages] = useState<LogRow[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync messages when server re-fetches for a new group
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, selectedGroup]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime — only subscribe when a group is selected
  useEffect(() => {
    if (!selectedGroup) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel('chats-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs' },
        payload => {
          const row = payload.new as LogRow;
          if (row.group_name === selectedGroup) {
            setMessages(prev => [...prev, row]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedGroup]);

  function selectGroup(name: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set('group', name);
    router.push(`/chats?${sp.toString()}`, { scroll: false });
  }

  const noGroups = groups.length === 0;

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 110px)',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
      }}
    >
      {/* ── Sidebar ── */}
      <div
        style={{
          width: '280px',
          flexShrink: 0,
          borderRight: '1px solid #E5E7EB',
          overflowY: 'auto',
          background: '#F9FAFB',
        }}
      >
        <div
          style={{
            padding: '1rem',
            borderBottom: '1px solid #E5E7EB',
            fontWeight: 600,
            fontSize: '0.875rem',
            color: '#374151',
          }}
        >
          Group Chats ({groups.length})
        </div>

        {noGroups && (
          <p style={{ padding: '1rem', color: '#9CA3AF', fontSize: '0.85rem' }}>
            No conversations yet.
          </p>
        )}

        {groups.map(g => {
          const active = selectedGroup === g.group_name;
          return (
            <button
              key={g.group_name}
              onClick={() => selectGroup(g.group_name)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '0.875rem 1rem',
                background: active ? '#EEF2FF' : 'transparent',
                borderLeft: active ? '3px solid #4F46E5' : '3px solid transparent',
                borderTop: 'none',
                borderRight: 'none',
                borderBottom: '1px solid #F3F4F6',
                cursor: 'pointer',
                display: 'block',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  color: active ? '#4F46E5' : '#111827',
                  marginBottom: '0.2rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {formatShortName(g.group_name)}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#9CA3AF',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span>{g.message_count} message{g.message_count !== 1 ? 's' : ''}</span>
                <span>{formatTime(g.last_message)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Chat panel ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selectedGroup ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
              fontSize: '0.95rem',
            }}
          >
            {noGroups ? 'No conversations yet — messages will appear here.' : 'Select a group chat to view the conversation.'}
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              style={{
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: '#fff',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#4F46E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                WA
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                  {formatShortName(selectedGroup)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6B7280' }}>
                  {messages.length} exchange{messages.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                background: '#F9FAFB',
              }}
            >
              {messages.length === 0 && (
                <p style={{ color: '#9CA3AF', textAlign: 'center', fontSize: '0.875rem' }}>
                  No messages in this group yet.
                </p>
              )}

              {messages.map(msg => (
                <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {/* Referee question — right aligned */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'right', marginBottom: '0.2rem' }}>
                        {formatShortName(msg.referee_num)} · {formatTime(msg.created_at)}
                      </div>
                      <div
                        style={{
                          background: '#4F46E5',
                          color: '#fff',
                          borderRadius: '16px 16px 4px 16px',
                          padding: '0.65rem 1rem',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                        }}
                      >
                        {msg.question}
                      </div>
                    </div>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#E0E7FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#4F46E5',
                        flexShrink: 0,
                      }}
                    >
                      REF
                    </div>
                  </div>

                  {/* Bot answer — left aligned */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        background: '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: '#fff',
                        flexShrink: 0,
                      }}
                    >
                      BOT
                    </div>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.2rem' }}>
                        NY Footy Bot
                      </div>
                      <div
                        style={{
                          background: '#fff',
                          color: '#111827',
                          borderRadius: '16px 16px 16px 4px',
                          padding: '0.65rem 1rem',
                          fontSize: '0.875rem',
                          lineHeight: '1.5',
                          border: '1px solid #E5E7EB',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        }}
                      >
                        {msg.answer}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
