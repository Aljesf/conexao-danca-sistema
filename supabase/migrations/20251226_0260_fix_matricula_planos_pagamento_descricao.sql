begin;

-- Garantir coluna descricao (corrige qualquer divergencia de schema)
alter table public.matricula_planos_pagamento
add column if not exists descricao text;

commit;
