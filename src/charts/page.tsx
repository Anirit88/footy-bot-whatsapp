import { Suspense } from 'react';
import { getSupabaseServer } from '@/lib/supabase-server';
import NavTabs from '@/components/NavTabs';
import ChatView from '@/components/ChatView';

export const revalidate = 0; // always fresh — realtime handles updates

interface SearchParams {
  group?: string;
}

export default async function ChatsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { group: selectedGroup } = await searchParams;
  const supabase = getSupabaseServer();

  // Fetch all logs to build group summaries + messages
  const { data: allLogs } = await supabase
    .from('logs')
    .select('id, question, answer, referee_num, group_name, created_at')
    .order('created_at', { ascending: true });

  const logs = allLogs ?? [];

  // Build group summaries: last message time + count
  const groupMap = new Map<string, { last_message: string; message_count: number }>();
  for (const row of logs) {
    if (!row.group_name) continue;
    const existing = groupMap.get(row.group_name);
    if (!existing || row.created_at > existing.last_message) {
      groupMap.set(row.group_name, {
        last_message: row.created_at,
        message_count: (existing?.message_count ?? 0) + 1,
      });
    } else {
      groupMap.set(row.group_name, {
        ...existing,
        message_count: existing.message_count + 1,
      });
    }
  }

  const groups = [...groupMap.entries()]
    .map(([group_name, meta]) => ({ group_name, ...meta }))
    .sort((a, b) => b.last_message.localeCompare(a.last_message));

  // Default to most recent group if none selected
  const activeGroup = selectedGroup ?? groups[0]?.group_name ?? null;

  // Messages for the selected group (chronological)
  const initialMessages = activeGroup
    ? logs.filter(l => l.group_name === activeGroup)
    : [];

  return (
    <div>
      <header
        style={{
          background: '#4F46E5',
          padding: '1rem 1.5rem 0',
          color: '#fff',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            NY Footy Referee Bot — Operations Dashboard
          </h1>
          <Suspense fallback={null}>
            <NavTabs />
          </Suspense>
        </div>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem 2rem' }}>
        <Suspense fallback={null}>
          <ChatView
            groups={groups}
            initialMessages={initialMessages}
            selectedGroup={activeGroup}
          />
        </Suspense>
      </main>
    </div>
  );
}
