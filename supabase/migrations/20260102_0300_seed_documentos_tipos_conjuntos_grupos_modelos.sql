begin;

-- Blindagem: se rodar seed em ambiente onde a coluna legada exista, derruba antes
alter table public.documentos_modelo
  drop column if exists tipo_contrato;

------------------------------------------------------------
-- 1) Tipos de documento (catÃ¡logo)
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
  ('CONTRATO', 'Contrato', 'Instrumento jurÃ­dico declarativo (nÃ£o executa financeiro).', true),
  ('TERMO', 'Termo', 'Documento acessÃ³rio (adesÃ£o, ciÃªncia, imagem, bolsa, etc.).', true),
  ('RECIBO', 'Recibo', 'Comprovante de operaÃ§Ã£o (loja/escola/cafÃ©).', true),
  ('DECLARACAO', 'DeclaraÃ§Ã£o', 'Documento declaratÃ³rio institucional.', true),
  ('FORMULARIO', 'FormulÃ¡rio', 'Documento preenchÃ­vel (ficha, cadastro, etc.).', true)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = excluded.ativo;

------------------------------------------------------------
-- 2) Conjuntos (padrÃµes institucionais)
------------------------------------------------------------
insert into public.documentos_conjuntos (codigo, nome, descricao, ativo)
values
  ('MATRICULA_REGULAR', 'MatrÃ­cula Regular', 'Conjunto institucional para matrÃ­cula de aluno pagante regular.', true),
  ('BOLSA_MOVIMENTO', 'Bolsa Movimento', 'Conjunto institucional para concessÃ£o de bolsa (Movimento ConexÃ£o DanÃ§a).', true),
  ('CURSO_LIVRE', 'Curso Livre / Workshop', 'Conjunto institucional para cursos livres e workshops.', true),
  ('VENDA_LOJA', 'Venda Loja', 'Conjunto institucional para emissÃ£o de recibo/comprovante de vendas da loja.', true),
  ('PRESTACAO_SERVICO', 'PrestaÃ§Ã£o de ServiÃ§o', 'Conjunto institucional para contrataÃ§Ã£o de prestadores.', true)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = excluded.ativo;

------------------------------------------------------------
-- 3) Grupos por conjunto (com papel)
--    Regra: PRINCIPAL deve existir e ser Ãºnico por conjunto.
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
    -- MATRÃCULA_REGULAR
    select 'MATRICULA_REGULAR'::text as conjunto_codigo, 'DOCUMENTO_PRINCIPAL'::text as codigo, 'Documento principal'::text as nome,
           'Contrato principal da matrÃ­cula.'::text as descricao, 'PRINCIPAL'::text as papel, true as obrigatorio, 1 as ordem
    union all
    select 'MATRICULA_REGULAR','TERMOS_OBRIGATORIOS','Termos obrigatÃ³rios','Termos que sempre acompanham a matrÃ­cula.','OBRIGATORIO', true, 2
    union all
    select 'MATRICULA_REGULAR','TERMOS_OPCIONAIS','Termos opcionais','Termos opcionais (ex.: imagem).','OPCIONAL', false, 3
    union all
    select 'MATRICULA_REGULAR','ANEXOS','Anexos','Anexos e documentos complementares.','ADICIONAL', false, 4

    -- BOLSA_MOVIMENTO
    union all
    select 'BOLSA_MOVIMENTO','DOCUMENTO_PRINCIPAL','Documento principal','Termo/contrato de concessÃ£o de bolsa.','PRINCIPAL', true, 1
    union all
    select 'BOLSA_MOVIMENTO','TERMOS_OBRIGATORIOS','Termos obrigatÃ³rios','Termos obrigatÃ³rios da bolsa.','OBRIGATORIO', true, 2
    union all
    select 'BOLSA_MOVIMENTO','TERMOS_OPCIONAIS','Termos opcionais','Termos opcionais (ex.: imagem).','OPCIONAL', false, 3
    union all
    select 'BOLSA_MOVIMENTO','ADITIVOS','Aditivos','Aditivos e termos adicionais.','ADICIONAL', false, 4

    -- CURSO_LIVRE
    union all
    select 'CURSO_LIVRE','DOCUMENTO_PRINCIPAL','Documento principal','Documento principal do curso livre/workshop.','PRINCIPAL', true, 1
    union all
    select 'CURSO_LIVRE','TERMOS_OBRIGATORIOS','Termos obrigatÃ³rios','Termos obrigatÃ³rios do curso livre.','OBRIGATORIO', true, 2
    union all
    select 'CURSO_LIVRE','TERMOS_OPCIONAIS','Termos opcionais','Termos opcionais.','OPCIONAL', false, 3

    -- VENDA_LOJA
    union all
    select 'VENDA_LOJA','DOCUMENTO_PRINCIPAL','Documento principal','Recibo/comprovante de venda.','PRINCIPAL', true, 1
    union all
    select 'VENDA_LOJA','TERMOS_OPCIONAIS','Termos opcionais','Troca/devoluÃ§Ã£o, observaÃ§Ãµes, etc.','OPCIONAL', false, 2

    -- PRESTACAO_SERVICO
    union all
    select 'PRESTACAO_SERVICO','DOCUMENTO_PRINCIPAL','Documento principal','Contrato principal de prestaÃ§Ã£o.','PRINCIPAL', true, 1
    union all
    select 'PRESTACAO_SERVICO','TERMOS_OBRIGATORIOS','Termos obrigatÃ³rios','Termos obrigatÃ³rios da contrataÃ§Ã£o.','OBRIGATORIO', true, 2
    union all
    select 'PRESTACAO_SERVICO','TERMOS_OPCIONAIS','Termos opcionais','Confidencialidade, cessÃµes, etc.','OPCIONAL', false, 3
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
-- 4) VariÃ¡veis mÃ­nimas (se nÃ£o existirem)
-- (mantÃ©m compatibilidade com o que vocÃª jÃ¡ inseriu antes)
------------------------------------------------------------
insert into public.documentos_variaveis (codigo, descricao, origem, tipo, path_origem, formato, ativo)
values
  ('ALUNO_NOME', 'Nome completo do aluno', 'ALUNO', 'TEXTO', 'aluno.nome', null, true),
  ('RESP_FIN_NOME', 'Nome do responsÃ¡vel financeiro', 'RESPONSAVEL_FINANCEIRO', 'TEXTO', 'responsavel.nome', null, true),
  ('MATRICULA_ANO', 'Ano de referÃªncia da matrÃ­cula', 'MATRICULA', 'TEXTO', 'matricula.ano_referencia', null, true),
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
-- 5) Modelos (minutas) â€” CONTRATO
-- ObservaÃ§Ã£o: texto_modelo_md armazena HTML (compatÃ­vel com editor rico)
------------------------------------------------------------

-- helper: garantir tipo_documento em documentos_modelo (coluna pode existir ou nÃ£o)
-- Se nÃ£o existir, este insert ainda funciona porque nÃ£o depende dela; mas incluÃ­mos se existir.
-- EstratÃ©gia: inserir campos comuns e deixar tipo_documento como coluna opcional.
-- Supabase aceitarÃ¡ colunas extras apenas se existirem; por isso nÃ£o usamos coluna tipo_documento no insert.

-- Minuta: MatrÃ­cula 2026
insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
values
(
  'Minuta â€” Contrato MatrÃ­cula 2026',
  'v0.1',
  true,
  '<h2>CONTRATO DE PRESTAÃ‡ÃƒO DE SERVIÃ‡OS â€” MATRÃCULA 2026</h2>
  <p><strong>InstituiÃ§Ã£o:</strong> {{ESCOLA_NOME}}</p>
  <p><strong>Aluno(a):</strong> {{ALUNO_NOME}}</p>
  <p><strong>ResponsÃ¡vel financeiro:</strong> {{RESP_FIN_NOME}}</p>
  <p><strong>Curso/Turma:</strong> {{CURSO_NOME}}</p>
  <p><strong>Ano de referÃªncia:</strong> {{MATRICULA_ANO}}</p>
  <hr/>
  <p>Este contrato Ã© instrumento declarativo e faz referÃªncia aos documentos normativos vigentes da ConexÃ£o DanÃ§a.</p>
  <p><strong>Valor total contratado (snapshot):</strong> {{VALOR_TOTAL_CONTRATADO}}</p>
  <p>Os detalhes de cobranÃ§a, vencimentos e liquidaÃ§Ã£o seguem o CartÃ£o ConexÃ£o e as Regras Oficiais.</p>
  <p><em>Minuta v0.1 â€” editar conforme necessidade.</em></p>',
  '[]'::jsonb,
  'Minuta inicial para ediÃ§Ã£o no editor rico.'
)
on conflict do nothing;

-- Minuta: MatrÃ­cula 2024 (desconto inauguracao + perda de direito)
insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
values
(
  'Minuta â€” Contrato MatrÃ­cula 2024 (CondiÃ§Ã£o Especial)',
  'v0.1',
  true,
  '<h2>CONTRATO DE PRESTAÃ‡ÃƒO DE SERVIÃ‡OS â€” MATRÃCULA 2024 (CONDIÃ‡ÃƒO ESPECIAL)</h2>
  <p><strong>InstituiÃ§Ã£o:</strong> {{ESCOLA_NOME}}</p>
  <p><strong>Aluno(a):</strong> {{ALUNO_NOME}}</p>
  <p><strong>ResponsÃ¡vel financeiro:</strong> {{RESP_FIN_NOME}}</p>
  <p><strong>Curso/Turma:</strong> {{CURSO_NOME}}</p>
  <p><strong>Ano de referÃªncia:</strong> {{MATRICULA_ANO}}</p>
  <hr/>
  <p><strong>ClÃ¡usula de condiÃ§Ã£o especial (inauguraÃ§Ã£o):</strong> este contrato aplica condiÃ§Ã£o especial de valores concedida na fase de inauguraÃ§Ã£o (2024).</p>
  <p><strong>Perda da condiÃ§Ã£o:</strong> em caso de afastamento/ruptura e posterior retorno, a condiÃ§Ã£o poderÃ¡ nÃ£o ser mantida, conforme polÃ­tica vigente.</p>
  <p><strong>Valor total contratado (snapshot):</strong> {{VALOR_TOTAL_CONTRATADO}}</p>
  <p><em>Minuta v0.1 â€” editar conforme necessidade.</em></p>',
  '[]'::jsonb,
  'Minuta inicial com clÃ¡usulas-base do desconto histÃ³rico.'
)
on conflict do nothing;

-- Minuta: Bolsa artÃ­stica (Movimento ConexÃ£o DanÃ§a)
insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
values
(
  'Minuta â€” Termo de Bolsa ArtÃ­stica (Movimento ConexÃ£o DanÃ§a)',
  'v0.1',
  true,
  '<h2>TERMO DE CONCESSÃƒO DE BOLSA ARTÃSTICA â€” MOVIMENTO CONEXÃƒO DANÃ‡A</h2>
  <p><strong>InstituiÃ§Ã£o:</strong> {{ESCOLA_NOME}}</p>
  <p><strong>BeneficiÃ¡rio(a):</strong> {{ALUNO_NOME}}</p>
  <p><strong>ResponsÃ¡vel (quando aplicÃ¡vel):</strong> {{RESP_FIN_NOME}}</p>
  <p><strong>Curso/Turma/Projeto:</strong> {{CURSO_NOME}}</p>
  <hr/>
  <p>Este termo formaliza a concessÃ£o de bolsa artÃ­stica/social e suas condiÃ§Ãµes gerais.</p>
  <p><strong>ObservaÃ§Ãµes e contrapartidas:</strong> {{OBSERVACOES_GERAIS}}</p>
  <p><em>Minuta v0.1 â€” editar conforme necessidade.</em></p>',
  '[]'::jsonb,
  'Minuta inicial do termo/contrato de bolsa artÃ­stica.'
)
on conflict do nothing;

------------------------------------------------------------
-- ============================================================
-- Vínculo Grupo ↔ Modelos (principal) — CONTRATO + FICHA
-- ============================================================

with
g as (
  select g.id as grupo_id
  from public.documentos_grupos g
  join public.documentos_conjuntos c on c.id = g.conjunto_id
  where c.codigo = 'MATRICULA_REGULAR'
    and g.codigo = 'DOCUMENTO_PRINCIPAL'
  limit 1
),
m_contrato as (
  select id as modelo_id
  from public.documentos_modelo
  where titulo = 'Minuta â€” Contrato MatrÃ­cula 2026'
  order by id desc
  limit 1
),
m_ficha as (
  select id as modelo_id
  from public.documentos_modelo
  where titulo = 'Ficha Financeira — Matrícula Pagante'
  order by id desc
  limit 1
),
ins as (
  select g.grupo_id as conjunto_grupo_id, m_contrato.modelo_id, 1::int as ordem, true as ativo
  from g, m_contrato
  union all
  select g.grupo_id as conjunto_grupo_id, m_ficha.modelo_id, 2::int as ordem, true as ativo
  from g, m_ficha
)
insert into public.documentos_conjuntos_grupos_modelos (conjunto_grupo_id, modelo_id, ordem, ativo)
select i.conjunto_grupo_id, i.modelo_id, i.ordem, i.ativo
from ins i
where i.modelo_id is not null
  and not exists (
    select 1
    from public.documentos_conjuntos_grupos_modelos x
    where x.conjunto_grupo_id = i.conjunto_grupo_id
      and x.modelo_id = i.modelo_id
  );

commit;

select pg_notify('pgrst', 'reload schema');
