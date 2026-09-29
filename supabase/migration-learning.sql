-- ============================================================================
-- Extraction learning loop: remember each dish photo (a short visual
-- description + its embedding) and the FINAL (human-corrected) dish name. New
-- extractions retrieve the most visually similar past corrections and use them
-- as hints, so identification gets smarter every time someone edits a result.
-- Additive + safe to re-run. The app writes/reads this best-effort (via the
-- service role), so it degrades gracefully if this migration hasn't run.
-- ============================================================================

create extension if not exists vector;

create table if not exists public.extraction_memory (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  photo_url      text,
  description    text,            -- one-line visual description of the photo
  embedding      vector(1536),    -- OpenAI text-embedding-3-small of the description
  extracted_title text,           -- what the model first guessed
  dish_name      text,            -- the FINAL name once the user posts (kept = confirmed, or their edit)
  confirmed      boolean not null default false, -- true once a human posted the cook (reviewed it)
  recipe_id      uuid,
  created_at     timestamptz not null default now()
);

create index if not exists extraction_memory_embedding_idx
  on public.extraction_memory using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Only the service role touches this table (the extraction/learn routes use it);
-- RLS on with no public policies keeps it private by default.
alter table public.extraction_memory enable row level security;

-- Nearest-neighbour lookup over CONFIRMED examples only (a human posted the
-- cook, so the label is trusted — whether they kept it or corrected it).
create or replace function public.match_extraction_memory(query_embedding vector(1536), match_count int)
returns table (dish_name text, description text, similarity float)
language sql stable as $$
  select dish_name, description, 1 - (embedding <=> query_embedding) as similarity
  from public.extraction_memory
  where dish_name is not null and embedding is not null and confirmed = true
  order by embedding <=> query_embedding
  limit match_count;
$$;
