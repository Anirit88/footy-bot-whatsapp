-- Enable pgvector
create extension if not exists vector;

-- Rulebook chunks table (pre-populated separately — do not seed this)
create table if not exists chunks (
  id         uuid primary key default gen_random_uuid(),
  source     text not null,
  content    text not null,
  embedding  vector(1024),
  created_at timestamptz default now()
);

create index if not exists chunks_embedding_idx
  on chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Semantic search function
create or replace function match_chunks(
  query_embedding vector(1024),
  match_count     int default 5
)
returns table (id uuid, source text, content text, similarity float)
language sql stable as $$
  select id, source, content,
         1 - (embedding <=> query_embedding) as similarity
  from chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Q&A logs table — every question asked and answered
create table if not exists logs (
  id           uuid primary key default gen_random_uuid(),
  question     text not null,
  answer       text not null,
  referee_num  text,
  group_name   text,
  created_at   timestamptz default now()
);

-- Enable Supabase Realtime on logs table
alter publication supabase_realtime add table logs;

-- Permissions
grant execute on function match_chunks to anon;
grant select, insert on chunks to anon;
grant select, insert on logs   to anon;
grant all on chunks to service_role;
grant all on logs   to service_role;
