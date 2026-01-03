begin;

-- Blindagem: se rodar seed em ambiente onde a coluna legada exista, derruba antes
alter table public.documentos_modelo
  drop column if exists tipo_contrato;

------------------------------------------------------------
-- 1) Tipos de documento (catálogo)
------------------------------------------------------------
create table if not exists public.documentos_tipos (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nome text not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.documentos_tipos (codigo, nome, descricao, ativo)
values
  ('CONTRATO', 'Contrato', 'Instrumento jurídico declarativo (não executa financeiro).', true),
  ('TERMO', 'Termo', 'Documento acessório (adesão, ciência, imagem, bolsa, etc.).', true),
  ('RECIBO', 'Recibo', 'Comprovante de operação (loja/escola/café).', true),
  ('DECLARACAO', 'Declaração', 'Documento declaratório institucional.', true),
  ('FORMULARIO', 'Formulário', 'Documento preenchível (ficha, cadastro, etc.).', true)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = excluded.ativo;

------------------------------------------------------------
-- 2) Conjuntos (padrões institucionais)
------------------------------------------------------------
insert into public.documentos_conjuntos (codigo, nome, descricao, ativo)
values
  ('MATRICULA_REGULAR', 'Matrícula Regular', 'Conjunto institucional para matrícula de aluno pagante regular.', true),
  ('BOLSA_MOVIMENTO', 'Bolsa Movimento', 'Conjunto institucional para concessão de bolsa (Movimento Conexão Dança).', true),
  ('CURSO_LIVRE', 'Curso Livre / Workshop', 'Conjunto institucional para cursos livres e workshops.', true),
  ('VENDA_LOJA', 'Venda Loja', 'Conjunto institucional para emissão de recibo/comprovante de vendas da loja.', true),
  ('PRESTACAO_SERVICO', 'Prestação de Serviço', 'Conjunto institucional para contratação de prestadores.', true)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = excluded.ativo;

------------------------------------------------------------
-- 3) Grupos por conjunto (com papel)
--    Regra: PRINCIPAL deve existir e ser único por conjunto.
------------------------------------------------------------
with conj as (
  select id, codigo from public.documentos_conjuntos
),
ins as (
  select
    c.id as conjunto_id,
    g.codigo,
    g.nome,
    g.descricao,
    g.papel,
    g.obrigatorio,
    g.ordem
  from conj c
  join (
    -- MATRÍCULA_REGULAR
    select 'MATRICULA_REGULAR'::text as conjunto_codigo, 'DOCUMENTO_PRINCIPAL'::text as codigo, 'Documento principal'::text as nome,
           'Contrato principal da matrícula.'::text as descricao, 'PRINCIPAL'::text as papel, true as obrigatorio, 1 as ordem
    union all
    select 'MATRICULA_REGULAR','TERMOS_OBRIGATORIOS','Termos obrigatórios','Termos que sempre acompanham a matrícula.','OBRIGATORIO', true, 2
    union all
    select 'MATRICULA_REGULAR','TERMOS_OPCIONAIS','Termos opcionais','Termos opcionais (ex.: imagem).','OPCIONAL', false, 3
    union all
    select 'MATRICULA_REGULAR','ANEXOS','Anexos','Anexos e documentos complementares.','ADICIONAL', false, 4

    -- BOLSA_MOVIMENTO
    union all
    select 'BOLSA_MOVIMENTO','DOCUMENTO_PRINCIPAL','Documento principal','Termo/contrato de concessão de bolsa.','PRINCIPAL', true, 1
    union all
    select 'BOLSA_MOVIMENTO','TERMOS_OBRIGATORIOS','Termos obrigatórios','Termos obrigatórios da bolsa.','OBRIGATORIO', true, 2
    union all
    select 'BOLSA_MOVIMENTO','TERMOS_OPCIONAIS','Termos opcionais','Termos opcionais (ex.: imagem).','OPCIONAL', false, 3
    union all
    select 'BOLSA_MOVIMENTO','ADITIVOS','Aditivos','Aditivos e termos adicionais.','ADICIONAL', false, 4

    -- CURSO_LIVRE
    union all
    select 'CURSO_LIVRE','DOCUMENTO_PRINCIPAL','Documento principal','Documento principal do curso livre/workshop.','PRINCIPAL', true, 1
    union all
    select 'CURSO_LIVRE','TERMOS_OBRIGATORIOS','Termos obrigatórios','Termos obrigatórios do curso livre.','OBRIGATORIO', true, 2
    union all
    select 'CURSO_LIVRE','TERMOS_OPCIONAIS','Termos opcionais','Termos opcionais.','OPCIONAL', false, 3

    -- VENDA_LOJA
    union all
    select 'VENDA_LOJA','DOCUMENTO_PRINCIPAL','Documento principal','Recibo/comprovante de venda.','PRINCIPAL', true, 1
    union all
    select 'VENDA_LOJA','TERMOS_OPCIONAIS','Termos opcionais','Troca/devolução, observações, etc.','OPCIONAL', false, 2

    -- PRESTACAO_SERVICO
    union all
    select 'PRESTACAO_SERVICO','DOCUMENTO_PRINCIPAL','Documento principal','Contrato principal de prestação.','PRINCIPAL', true, 1
    union all
    select 'PRESTACAO_SERVICO','TERMOS_OBRIGATORIOS','Termos obrigatórios','Termos obrigatórios da contratação.','OBRIGATORIO', true, 2
    union all
    select 'PRESTACAO_SERVICO','TERMOS_OPCIONAIS','Termos opcionais','Confidencialidade, cessões, etc.','OPCIONAL', false, 3
  ) g on g.conjunto_codigo = c.codigo
)
insert into public.documentos_grupos (conjunto_id, codigo, nome, descricao, papel, obrigatorio, ordem)
select conjunto_id, codigo, nome, descricao, papel, obrigatorio, ordem
from ins
on conflict (conjunto_id, codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    papel = excluded.papel,
    obrigatorio = excluded.obrigatorio,
    ordem = excluded.ordem;

------------------------------------------------------------
-- 4) Variáveis mínimas (se não existirem)
-- (mantém compatibilidade com o que você já inseriu antes)
------------------------------------------------------------
insert into public.documentos_variaveis (codigo, descricao, origem, tipo, path_origem, formato, ativo)
values
  ('ALUNO_NOME', 'Nome completo do aluno', 'ALUNO', 'TEXTO', 'aluno.nome', null, true),
  ('RESP_FIN_NOME', 'Nome do responsável financeiro', 'RESPONSAVEL_FINANCEIRO', 'TEXTO', 'responsavel.nome', null, true),
  ('MATRICULA_ANO', 'Ano de referência da matrícula', 'MATRICULA', 'TEXTO', 'matricula.ano_referencia', null, true),
  ('CURSO_NOME', 'Nome do curso/turma', 'TURMA', 'TEXTO', 'turma.nome', null, true),
  ('VALOR_TOTAL_CONTRATADO', 'Valor total contratado', 'FINANCEIRO', 'MONETARIO', 'snapshot_financeiro.valor_total_contratado_centavos', 'BRL', true)
on conflict (codigo) do update
set descricao = excluded.descricao,
    origem = excluded.origem,
    tipo = excluded.tipo,
    path_origem = excluded.path_origem,
    formato = excluded.formato,
    ativo = excluded.ativo;

------------------------------------------------------------
-- 5) Modelos (minutas) — CONTRATO
-- Observação: texto_modelo_md armazena HTML (compatível com editor rico)
------------------------------------------------------------

-- helper: garantir tipo_documento em documentos_modelo (coluna pode existir ou não)
-- Se não existir, este insert ainda funciona porque não depende dela; mas incluímos se existir.
-- Estratégia: inserir campos comuns e deixar tipo_documento como coluna opcional.
-- Supabase aceitará colunas extras apenas se existirem; por isso não usamos coluna tipo_documento no insert.

-- Minuta: Matrícula 2026
insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
values
(
  'Minuta — Contrato Matrícula 2026',
  'v0.1',
  true,
  '<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS — MATRÍCULA 2026</h2>
  <p><strong>Instituição:</strong> {{ESCOLA_NOME}}</p>
  <p><strong>Aluno(a):</strong> {{ALUNO_NOME}}</p>
  <p><strong>Responsável financeiro:</strong> {{RESP_FIN_NOME}}</p>
  <p><strong>Curso/Turma:</strong> {{CURSO_NOME}}</p>
  <p><strong>Ano de referência:</strong> {{MATRICULA_ANO}}</p>
  <hr/>
  <p>Este contrato é instrumento declarativo e faz referência aos documentos normativos vigentes da Conexão Dança.</p>
  <p><strong>Valor total contratado (snapshot):</strong> {{VALOR_TOTAL_CONTRATADO}}</p>
  <p>Os detalhes de cobrança, vencimentos e liquidação seguem o Cartão Conexão e as Regras Oficiais.</p>
  <p><em>Minuta v0.1 — editar conforme necessidade.</em></p>',
  '[]'::jsonb,
  'Minuta inicial para edição no editor rico.'
)
on conflict do nothing;

-- Minuta: Matrícula 2024 (desconto inauguracao + perda de direito)
insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
values
(
  'Minuta — Contrato Matrícula 2024 (Condição Especial)',
  'v0.1',
  true,
  '<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS — MATRÍCULA 2024 (CONDIÇÃO ESPECIAL)</h2>
  <p><strong>Instituição:</strong> {{ESCOLA_NOME}}</p>
  <p><strong>Aluno(a):</strong> {{ALUNO_NOME}}</p>
  <p><strong>Responsável financeiro:</strong> {{RESP_FIN_NOME}}</p>
  <p><strong>Curso/Turma:</strong> {{CURSO_NOME}}</p>
  <p><strong>Ano de referência:</strong> {{MATRICULA_ANO}}</p>
  <hr/>
  <p><strong>Cláusula de condição especial (inauguração):</strong> este contrato aplica condição especial de valores concedida na fase de inauguração (2024).</p>
  <p><strong>Perda da condição:</strong> em caso de afastamento/ruptura e posterior retorno, a condição poderá não ser mantida, conforme política vigente.</p>
  <p><strong>Valor total contratado (snapshot):</strong> {{VALOR_TOTAL_CONTRATADO}}</p>
  <p><em>Minuta v0.1 — editar conforme necessidade.</em></p>',
  '[]'::jsonb,
  'Minuta inicial com cláusulas-base do desconto histórico.'
)
on conflict do nothing;

-- Minuta: Bolsa artística (Movimento Conexão Dança)
insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
values
(
  'Minuta — Termo de Bolsa Artística (Movimento Conexão Dança)',
  'v0.1',
  true,
  '<h2>TERMO DE CONCESSÃO DE BOLSA ARTÍSTICA — MOVIMENTO CONEXÃO DANÇA</h2>
  <p><strong>Instituição:</strong> {{ESCOLA_NOME}}</p>
  <p><strong>Beneficiário(a):</strong> {{ALUNO_NOME}}</p>
  <p><strong>Responsável (quando aplicável):</strong> {{RESP_FIN_NOME}}</p>
  <p><strong>Curso/Turma/Projeto:</strong> {{CURSO_NOME}}</p>
  <hr/>
  <p>Este termo formaliza a concessão de bolsa artística/social e suas condições gerais.</p>
  <p><strong>Observações e contrapartidas:</strong> {{OBSERVACOES_GERAIS}}</p>
  <p><em>Minuta v0.1 — editar conforme necessidade.</em></p>',
  '[]'::jsonb,
  'Minuta inicial do termo/contrato de bolsa artística.'
)
on conflict do nothing;

------------------------------------------------------------
-- 6) Vínculo Grupo ↔ Modelos (principal)
-- - Matrícula Regular (Documento principal) recebe 2026 e 2024
-- - Bolsa Movimento (Documento principal) recebe Bolsa Artística
------------------------------------------------------------

with
g_mr as (
  select g.id as grupo_id
  from public.documentos_grupos g
  join public.documentos_conjuntos c on c.id = g.conjunto_id
  where c.codigo = 'MATRICULA_REGULAR' and g.codigo = 'DOCUMENTO_PRINCIPAL'
  limit 1
),
g_bm as (
  select g.id as grupo_id
  from public.documentos_grupos g
  join public.documentos_conjuntos c on c.id = g.conjunto_id
  where c.codigo = 'BOLSA_MOVIMENTO' and g.codigo = 'DOCUMENTO_PRINCIPAL'
  limit 1
),
m_2026 as (
  select id as modelo_id from public.documentos_modelo where titulo = 'Minuta — Contrato Matrícula 2026' order by id desc limit 1
),
m_2024 as (
  select id as modelo_id from public.documentos_modelo where titulo = 'Minuta — Contrato Matrícula 2024 (Condição Especial)' order by id desc limit 1
),
m_bolsa as (
  select id as modelo_id from public.documentos_modelo where titulo = 'Minuta — Termo de Bolsa Artística (Movimento Conexão Dança)' order by id desc limit 1
)
insert into public.documentos_conjuntos_grupos_modelos (conjunto_grupo_id, modelo_id)
select g_mr.grupo_id, m_2026.modelo_id from g_mr, m_2026
on conflict do nothing;

insert into public.documentos_conjuntos_grupos_modelos (conjunto_grupo_id, modelo_id)
select g_mr.grupo_id, m_2024.modelo_id from g_mr, m_2024
on conflict do nothing;

insert into public.documentos_conjuntos_grupos_modelos (conjunto_grupo_id, modelo_id)
select g_bm.grupo_id, m_bolsa.modelo_id from g_bm, m_bolsa
on conflict do nothing;

commit;

select pg_notify('pgrst', 'reload schema');
