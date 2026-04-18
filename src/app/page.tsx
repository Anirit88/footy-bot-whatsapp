import { Suspense } from 'react';
import { getSupabaseServer } from '@/lib/supabase-server';
import MetricCards from '@/components/MetricCards';
import BarChart from '@/components/BarChart';
import SearchFilter from '@/components/SearchFilter';
import LogFeed from '@/components/LogFeed';
import NavTabs from '@/components/NavTabs';

export const revalidate = 60;

interface SearchParams {
  q?: string;
  group?: string;
}

interface LogRow {
  id: string;
  question: string;
  answer: string;
  referee_num: string | null;
  group_name: string | null;
  created_at: string;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, group } = await searchParams;
  const supabase = getSupabaseServer();

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const fourteenAgo = new Date(now.getTime() - 14 * 86400000).toISOString();

  const [
    { count: total },
    { count: todayCount },
    { count: weekCount },
    { data: groupRows },
    { data: refereeRows },
    { data: recentLogs },
    { data: rawLogs },
  ] = await Promise.all([
    supabase.from('logs').select('*', { count: 'exact', head: true }),
    supabase.from('logs').select('*', { count: 'exact', head: true }).gte('created_at', todayStr),
    supabase.from('logs').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    supabase.from('logs').select('group_name'),
    supabase.from('logs').select('referee_num'),
    supabase.from('logs').select('created_at').gte('created_at', fourteenAgo),
    supabase
      .from('logs')
      .select('id, question, answer, referee_num, group_name, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const uniqueGroups = [...new Set((groupRows ?? []).map(r => r.group_name).filter(Boolean) as string[])].sort();
  const uniqueReferees = new Set((refereeRows ?? []).map(r => r.referee_num).filter(Boolean)).size;

  const dayCounts: Record<string, number> = {};
  for (const row of recentLogs ?? []) {
    const day = (row.created_at as string).split('T')[0];
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }

  let logs: LogRow[] = (rawLogs ?? []) as LogRow[];
  if (q) {
    const qLower = q.toLowerCase();
    logs = logs.filter(
      l =>
        l.question.toLowerCase().includes(qLower) ||
        l.answer.toLowerCase().includes(qLower)
    );
  }
  if (group) {
    logs = logs.filter(l => l.group_name === group);
  }

  const metrics = {
    total: total ?? 0,
    today: todayCount ?? 0,
    thisWeek: weekCount ?? 0,
    uniqueGroups: uniqueGroups.length,
    uniqueReferees,
  };

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

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1rem 4rem' }}>
        <MetricCards metrics={metrics} />
        <BarChart dayCounts={dayCounts} />
        <Suspense fallback={null}>
          <SearchFilter groups={uniqueGroups} resultCount={logs.length} />
        </Suspense>
        <LogFeed initialLogs={logs} searchQuery={q ?? ''} groupFilter={group ?? ''} />
      </main>
    </div>
  );
}
