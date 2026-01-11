-- 1) Tabela canonica de configuracao do sistema (single-row)
create table if not exists public.system_settings (
  id bigint generated always as identity primary key,

  -- Nome oficial do sistema
  system_name text not null default 'Conectarte',

  -- Logos (URLs do Supabase Storage) - podem ser nulas (usa fallback do repo)
  logo_color_url text null,
  logo_white_url text null,
  logo_transparent_url text null,

  -- Wordmark (logo escrita) em segmentos + cor.
  -- Ex.: [{ "text": "Conect", "color": "blue" }, { "text": "ar", "color": "red" }, ...]
  wordmark_segments jsonb not null default '[
    {"text":"Conect","color":"blue"},
    {"text":"ar","color":"red"},
    {"text":"t","color":"orange"},
    {"text":"e","color":"green"}
  ]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) Garantir 1 linha (single-row)
insert into public.system_settings (system_name)
select 'Conectarte'
where not exists (select 1 from public.system_settings);

-- 3) updated_at trigger (se ja existir funcao padrao no projeto, trocar por ela)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_system_settings_updated_at on public.system_settings;
create trigger trg_system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

