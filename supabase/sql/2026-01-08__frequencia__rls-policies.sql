begin;

-- 1) TURMA_AULAS

drop policy if exists "dc_turma_aulas_select" on public.turma_aulas;
create policy "dc_turma_aulas_select"
on public.turma_aulas
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  )
  or
  exists (
    select 1
    from public.turma_professores tp
    join public.colaboradores c
      on c.id = tp.colaborador_id
    join public.profiles p
      on p.pessoa_id = c.pessoa_id
    where tp.turma_id = public.turma_aulas.turma_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "dc_turma_aulas_insert" on public.turma_aulas;
create policy "dc_turma_aulas_insert"
on public.turma_aulas
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  )
  or
  exists (
    select 1
    from public.turma_professores tp
    join public.colaboradores c
      on c.id = tp.colaborador_id
    join public.profiles p
      on p.pessoa_id = c.pessoa_id
    where tp.turma_id = public.turma_aulas.turma_id
      and p.user_id = auth.uid()
  )
);

drop policy if exists "dc_turma_aulas_update" on public.turma_aulas;
create policy "dc_turma_aulas_update"
on public.turma_aulas
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  )
  or
  exists (
    select 1
    from public.turma_professores tp
    join public.colaboradores c
      on c.id = tp.colaborador_id
    join public.profiles p
      on p.pessoa_id = c.pessoa_id
    where tp.turma_id = public.turma_aulas.turma_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  )
  or
  exists (
    select 1
    from public.turma_professores tp
    join public.colaboradores c
      on c.id = tp.colaborador_id
    join public.profiles p
      on p.pessoa_id = c.pessoa_id
    where tp.turma_id = public.turma_aulas.turma_id
      and p.user_id = auth.uid()
  )
);

-- 2) TURMA_AULA_PRESENCAS

drop policy if exists "dc_presencas_select" on public.turma_aula_presencas;
create policy "dc_presencas_select"
on public.turma_aula_presencas
for select
to authenticated
using (
  exists (
    select 1
    from public.turma_aulas a
    where a.id = public.turma_aula_presencas.aula_id
      and (
        exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
        or exists (
          select 1
          from public.turma_professores tp
          join public.colaboradores c on c.id = tp.colaborador_id
          join public.profiles p on p.pessoa_id = c.pessoa_id
          where tp.turma_id = a.turma_id
            and p.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "dc_presencas_insert" on public.turma_aula_presencas;
create policy "dc_presencas_insert"
on public.turma_aula_presencas
for insert
to authenticated
with check (
  exists (
    select 1
    from public.turma_aulas a
    where a.id = public.turma_aula_presencas.aula_id
      and (
        exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
        or exists (
          select 1
          from public.turma_professores tp
          join public.colaboradores c on c.id = tp.colaborador_id
          join public.profiles p on p.pessoa_id = c.pessoa_id
          where tp.turma_id = a.turma_id
            and p.user_id = auth.uid()
        )
      )
  )
);

drop policy if exists "dc_presencas_update" on public.turma_aula_presencas;
create policy "dc_presencas_update"
on public.turma_aula_presencas
for update
to authenticated
using (
  exists (
    select 1
    from public.turma_aulas a
    where a.id = public.turma_aula_presencas.aula_id
      and (
        exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
        or exists (
          select 1
          from public.turma_professores tp
          join public.colaboradores c on c.id = tp.colaborador_id
          join public.profiles p on p.pessoa_id = c.pessoa_id
          where tp.turma_id = a.turma_id
            and p.user_id = auth.uid()
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.turma_aulas a
    where a.id = public.turma_aula_presencas.aula_id
      and (
        exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true)
        or exists (
          select 1
          from public.turma_professores tp
          join public.colaboradores c on c.id = tp.colaborador_id
          join public.profiles p on p.pessoa_id = c.pessoa_id
          where tp.turma_id = a.turma_id
            and p.user_id = auth.uid()
        )
      )
  )
);

commit;
