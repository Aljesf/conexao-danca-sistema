-- Padronizacao de forma de pagamento em recebimentos e contas_pagar_pagamentos
-- Mantem metodo_pagamento legado

alter table public.recebimentos
  add column if not exists forma_pagamento_codigo text null,
  add column if not exists cartao_maquina_id bigint null references public.cartao_maquinas(id),
  add column if not exists cartao_bandeira_id bigint null references public.cartao_bandeiras(id),
  add column if not exists cartao_numero_parcelas integer null;

alter table public.contas_pagar_pagamentos
  add column if not exists forma_pagamento_codigo text null,
  add column if not exists cartao_maquina_id bigint null references public.cartao_maquinas(id),
  add column if not exists cartao_bandeira_id bigint null references public.cartao_bandeiras(id),
  add column if not exists cartao_numero_parcelas integer null;
