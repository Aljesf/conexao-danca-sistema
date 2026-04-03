alter table public.eventos_escola_participantes_externos
  add column if not exists documento text null;

update public.eventos_escola_participantes_externos pe
set documento = p.cpf
from public.pessoas p
where p.id = pe.pessoa_id
  and pe.documento is null
  and p.cpf is not null;
