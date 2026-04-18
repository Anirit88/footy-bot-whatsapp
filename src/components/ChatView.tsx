'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

/* ── Types ─────────────────────────────────────────────── */

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

interface DirectMessage {
  id: string;
  role: 'user' | 'bot';
  content: string;
  ts: string;
}

interface Props {
  groups: GroupSummary[];
  initialMessages: LogRow[];
  selectedGroup: string | null;
}

/* ── Helpers ────────────────────────────────────────────── */

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function shortName(raw: string | null) {
  if (!raw) return 'Unknown';
  return raw.replace('whatsapp:', '').trim();
}

/* ── Avatar ─────────────────────────────────────────────── */

function Avatar({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: '50%',
        background: bg,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.6rem',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {label}
    </div>
  );
}

/* ── Direct Chat Panel ──────────────────────────────────── */

function DirectChatPanel() {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function sendMessage() {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg: DirectMessage = { id: crypto.randomUUID(), role: 'user', content: q, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      const botMsg: DirectMessage = {
        id: crypto.randomUUID(),
        role: 'bot',
        content: res.ok ? data.answer : (data.error ?? 'Something went wrong.'),
        ts: new Date().toISOString(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', content: 'Network error — please try again.', ts: new Date().toISOString() }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1rem', flexShrink: 0 }}>
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>NY Footy Referee Bot</div>
          <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>Ask any rulebook question directly</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#F9FAFB' }}>
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚽</div>
            <p style={{ color: '#6B7280', fontWeight: 600, marginBottom: '0.35rem' }}>Ask the Referee Bot</p>
            <p style={{ color: '#9CA3AF', fontSize: '0.8rem' }}>Type any NY Footy rule question below</p>
          </div>
        )}

        {messages.map(msg =>
          msg.role === 'user' ? (
            <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'right', marginBottom: '0.2rem' }}>{formatTime(msg.ts)}</div>
                <div style={{ background: '#4F46E5', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '0.65rem 1rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {msg.content}
                </div>
              </div>
              <Avatar label="OPS" bg="#E0E7FF" color="#4F46E5" />
            </div>
          ) : (
            <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
              <Avatar label="BOT" bg="#4F46E5" color="#fff" />
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.2rem' }}>NY Footy Bot · {formatTime(msg.ts)}</div>
                <div style={{ background: '#fff', color: '#111827', borderRadius: '16px 16px 16px 4px', padding: '0.65rem 1rem', fontSize: '0.875rem', lineHeight: 1.6, border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,.05)', whiteSpace: 'pre-wrap' }}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
            <Avatar label="BOT" bg="#4F46E5" color="#fff" />
            <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '0.75rem 1rem', border: '1px solid #E5E7EB', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#818CF8', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #E5E7EB', background: '#fff', display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask a rule question… (Enter to send, Shift+Enter for new line)"
          rows={2}
          style={{
            flex: 1,
            padding: '0.625rem 0.875rem',
            border: '1px solid #D1D5DB',
            borderRadius: '10px',
            fontSize: '0.875rem',
            resize: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || loading}
          style={{
            padding: '0.625rem 1.25rem',
            background: (!input.trim() || loading) ? '#C7D2FE' : '#4F46E5',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            height: '42px',
          }}
        >
          Send
        </button>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

/* ── WhatsApp Group Conversation ────────────────────────── */

function GroupConversation({ messages, selectedGroup }: { messages: LogRow[]; selectedGroup: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#fff' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#4F46E5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0 }}>WA</div>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{shortName(selectedGroup)}</div>
          <div style={{ fontSize: '0.72rem', color: '#6B7280' }}>{messages.length} exchange{messages.length !== 1 ? 's' : ''} · read-only log</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#F9FAFB' }}>
        {messages.length === 0 && (
          <p style={{ color: '#9CA3AF', textAlign: 'center', fontSize: '0.875rem', marginTop: '2rem' }}>No messages in this group yet.</p>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Referee question — right */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', alignItems: 'flex-end' }}>
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', textAlign: 'right', marginBottom: '0.2rem' }}>
                  {shortName(msg.referee_num)} · {formatTime(msg.created_at)}
                </div>
                <div style={{ background: '#4F46E5', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '0.65rem 1rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  {msg.question}
                </div>
              </div>
              <Avatar label="REF" bg="#E0E7FF" color="#4F46E5" />
            </div>

            {/* Bot answer — left */}
            <div style={{ display: 'flex', justifyContent: 'flex-start', gap: '0.5rem', alignItems: 'flex-end' }}>
              <Avatar label="BOT" bg="#4F46E5" color="#fff" />
              <div style={{ maxWidth: '70%' }}>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.2rem' }}>NY Footy Bot</div>
                <div style={{ background: '#fff', color: '#111827', borderRadius: '16px 16px 16px 4px', padding: '0.65rem 1rem', fontSize: '0.875rem', lineHeight: 1.6, border: '1px solid #E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,.05)', whiteSpace: 'pre-wrap' }}>
                  {msg.answer}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

/* ── Main ChatView ───────────────────────────────────────── */

export default function ChatView({ groups, initialMessages, selectedGroup }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  const [groupMessages, setGroupMessages] = useState<LogRow[]>(initialMessages);
  const [mode, setMode] = useState<'direct' | 'group'>(selectedGroup ? 'group' : 'direct');

  useEffect(() => {
    setGroupMessages(initialMessages);
    if (selectedGroup) setMode('group');
  }, [initialMessages, selectedGroup]);

  // Realtime for group conversations
  useEffect(() => {
    if (!selectedGroup) return;
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel('chats-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, payload => {
        const row = payload.new as LogRow;
        if (row.group_name === selectedGroup) {
          setGroupMessages(prev => [...prev, row]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedGroup]);

  function selectGroup(name: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set('group', name);
    router.push(`/chats?${sp.toString()}`, { scroll: false });
    setMode('group');
  }

  function selectDirect() {
    const sp = new URLSearchParams(params.toString());
    sp.delete('group');
    router.replace('/chats', { scroll: false });
    setMode('direct');
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 110px)', background: '#fff', borderRadius: '12px', border: '1px solid #E5E7EB', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 260, flexShrink: 0, borderRight: '1px solid #E5E7EB', overflowY: 'auto', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #E5E7EB', fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Chats
        </div>

        {/* Direct Chat entry */}
        <button
          onClick={selectDirect}
          style={{
            width: '100%',
            textAlign: 'left',
            padding: '0.875rem 1rem',
            background: mode === 'direct' ? '#EEF2FF' : 'transparent',
            borderLeft: mode === 'direct' ? '3px solid #4F46E5' : '3px solid transparent',
            borderTop: 'none',
            borderRight: 'none',
            borderBottom: '1px solid #E5E7EB',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.82rem', color: mode === 'direct' ? '#4F46E5' : '#111827' }}>
              Direct Chat
            </div>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>Test the bot live</div>
          </div>
        </button>

        {/* Divider */}
        {groups.length > 0 && (
          <div style={{ padding: '0.5rem 1rem', fontSize: '0.72rem', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.04em', background: '#F3F4F6' }}>
            WhatsApp Groups ({groups.length})
          </div>
        )}

        {groups.length === 0 && (
          <p style={{ padding: '1rem', color: '#9CA3AF', fontSize: '0.8rem' }}>No WhatsApp messages yet.</p>
        )}

        {groups.map(g => {
          const active = mode === 'group' && selectedGroup === g.group_name;
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
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: active ? '#4F46E5' : '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.2rem' }}>
                {shortName(g.group_name)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF', display: 'flex', justifyContent: 'space-between' }}>
                <span>{g.message_count} msg{g.message_count !== 1 ? 's' : ''}</span>
                <span>{formatTime(g.last_message)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Right Panel ── */}
      {mode === 'direct' ? (
        <DirectChatPanel />
      ) : selectedGroup ? (
        <GroupConversation messages={groupMessages} selectedGroup={selectedGroup} />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={{ fontSize: '2rem' }}>💬</span>
          <span style={{ fontSize: '0.95rem' }}>Select a group or start a Direct Chat</span>
        </div>
      )}
    </div>
  );
}
