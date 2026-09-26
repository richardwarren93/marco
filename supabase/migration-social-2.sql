-- ============================================================================
-- Featured cooks — the cold-start floor. Globally-visible "Marco" cooks so a
-- brand-new table (no crew yet) is alive but honest ("Fresh from Marco"), never
-- fake friends. Re-runnable (replaces the featured set each time).
-- ============================================================================

-- Allow system/featured cooks with no real author, and a featured flag.
alter table public.cooks alter column user_id drop not null;
alter table public.cooks add column if not exists is_featured boolean not null default false;

-- Featured cooks are readable by everyone; the rest stays crew-scoped.
drop policy if exists cooks_select on public.cooks;
create policy cooks_select on public.cooks for select
  using (is_featured = true or user_id = auth.uid() or (crew_id is not null and public.is_crew_member(crew_id)));

-- Seed / re-seed the featured set.
delete from public.cooks where is_featured = true;
insert into public.cooks (user_id, crew_id, is_featured, title, note, photo_url, card_treatment, author_name, author_avatar) values
 (null, null, true, 'Miso butter noodles', 'double the garlic. trust me.',        'https://marco-eta-lyart.vercel.app/food/meal1.jpg', 'polaroid', 'Marco', 'M'),
 (null, null, true, 'Pork dumplings',       'crispy bottoms are non-negotiable',   'https://marco-eta-lyart.vercel.app/food/meal2.jpg', 'polaroid', 'Marco', 'M'),
 (null, null, true, 'Chili tacos',          'the char is the whole point',         'https://marco-eta-lyart.vercel.app/food/meal3.jpg', 'poster',   'Marco', 'M'),
 (null, null, true, 'Gochujang wings',      'sticky, sweet, a little mean',        'https://marco-eta-lyart.vercel.app/food/meal4.jpg', 'receipt',  'Marco', 'M'),
 (null, null, true, 'Weekend shakshuka',    '15 min, one pan, unreal.',            'https://marco-eta-lyart.vercel.app/food/meal5.jpg', 'polaroid', 'Marco', 'M'),
 (null, null, true, 'Nashville hot chicken','bring napkins.',                      'https://marco-eta-lyart.vercel.app/food/meal6.jpg', 'poster',   'Marco', 'M');
