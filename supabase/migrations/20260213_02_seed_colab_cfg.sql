insert into public.colaborador_config_financeira (colaborador_id, gera_folha)
select c.id, false
from public.colaboradores c
left join public.colaborador_config_financeira cfg on cfg.colaborador_id = c.id
where cfg.id is null;

