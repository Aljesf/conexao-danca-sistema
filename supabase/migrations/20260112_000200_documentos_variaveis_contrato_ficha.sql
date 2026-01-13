begin;

-- =========================================================
-- DOCUMENTOS: Variaveis/Modelos para Contrato + Ficha Financeira
-- Data: 2026-01-12
-- =========================================================

-- 1) Variaveis simples (aluno/responsavel/matricula/turma)
insert into public.documentos_variaveis (codigo, descricao, origem, tipo, path_origem, formato, ativo)
values
  ('ALUNO_CPF', 'CPF do aluno', 'ALUNO', 'TEXTO', 'aluno.cpf', 'CPF', true),
  ('ALUNO_DATA_NASCIMENTO', 'Data de nascimento do aluno', 'ALUNO', 'DATA', 'aluno.nascimento', 'DATA_CURTA', true),
  ('RESP_FIN_CPF', 'CPF do responsavel financeiro', 'RESPONSAVEL_FINANCEIRO', 'TEXTO', 'responsavel.cpf', 'CPF', true),
  ('MATRICULA_ID', 'ID da matricula', 'MATRICULA', 'TEXTO', 'matricula.id', null, true),
  ('MATRICULA_DATA', 'Data da matricula', 'MATRICULA', 'DATA', 'matricula.data_matricula', 'DATA_CURTA', true),
  ('MATRICULA_STATUS', 'Status da matricula', 'MATRICULA', 'TEXTO', 'matricula.status', null, true),
  ('MATRICULA_TIPO', 'Tipo da matricula', 'MATRICULA', 'TEXTO', 'matricula.tipo_matricula', null, true),
  ('TURMA_TIPO', 'Tipo/modalidade da turma', 'TURMA', 'TEXTO', 'turma.tipo_turma', null, true),
  ('TURMA_NIVEL', 'Nivel da turma', 'TURMA', 'TEXTO', 'turma.nivel', null, true),
  ('TURMA_TURNO', 'Turno da turma', 'TURMA', 'TEXTO', 'turma.turno', null, true),
  ('TURMA_DATA_INICIO', 'Data de inicio da turma', 'TURMA', 'DATA', 'turma.data_inicio', 'DATA_CURTA', true),
  ('TURMA_DATA_FIM', 'Data de fim da turma', 'TURMA', 'DATA', 'turma.data_fim', 'DATA_CURTA', true)
on conflict (codigo) do update
set descricao = excluded.descricao,
    origem = excluded.origem,
    tipo = excluded.tipo,
    path_origem = excluded.path_origem,
    formato = excluded.formato,
    ativo = excluded.ativo;

-- 1.1) Variaveis financeiras (snapshot)
insert into public.documentos_variaveis (codigo, descricao, origem, tipo, path_origem, formato, ativo)
values
  ('VALOR_MENSALIDADE', 'Valor da mensalidade', 'FINANCEIRO', 'MONETARIO', 'snapshot_financeiro.valor_mensalidade_centavos', 'BRL', true),
  ('VALOR_MATRICULA', 'Valor da matricula', 'FINANCEIRO', 'MONETARIO', 'snapshot_financeiro.valor_matricula_centavos', 'BRL', true),
  ('NUMERO_PARCELAS', 'Numero de parcelas', 'FINANCEIRO', 'TEXTO', 'snapshot_financeiro.numero_parcelas', null, true),
  ('DIA_VENCIMENTO', 'Dia de vencimento', 'FINANCEIRO', 'TEXTO', 'snapshot_financeiro.dia_vencimento', null, true)
on conflict (codigo) do update
set descricao = excluded.descricao,
    origem = excluded.origem,
    tipo = excluded.tipo,
    path_origem = excluded.path_origem,
    formato = excluded.formato,
    ativo = excluded.ativo;

-- 2) Variaveis manuais
insert into public.documentos_variaveis (codigo, descricao, origem, tipo, path_origem, formato, ativo)
values
  ('TITULO_CONTRATO', 'Titulo do contrato', 'MANUAL', 'TEXTO', null, null, true),
  ('DESCRICAO_OBJETO', 'Descricao do objeto', 'MANUAL', 'TEXTO', null, null, true),
  ('DESCRICAO_PEDAGOGICA', 'Descricao pedagogica', 'MANUAL', 'TEXTO', null, null, true),
  ('REGRAS_CANCELAMENTO', 'Regras de cancelamento', 'MANUAL', 'TEXTO', null, null, true),
  ('DATA_ASSINATURA', 'Data da assinatura', 'MANUAL', 'DATA', null, 'DATA_CURTA', true)
on conflict (codigo) do update
set descricao = excluded.descricao,
    origem = excluded.origem,
    tipo = excluded.tipo,
    path_origem = excluded.path_origem,
    formato = excluded.formato,
    ativo = excluded.ativo;

-- 3) Variaveis da escola (path_origem aponta para escola.*)
insert into public.documentos_variaveis (codigo, descricao, origem, tipo, path_origem, formato, ativo)
values
  ('ESCOLA_NOME', 'Nome da escola', 'ESCOLA', 'TEXTO', 'escola.nome', null, true),
  ('ESCOLA_CNPJ', 'CNPJ da escola', 'ESCOLA', 'TEXTO', 'escola.cnpj', null, true),
  ('ESCOLA_ENDERECO', 'Endereco da escola', 'ESCOLA', 'TEXTO', 'escola.endereco', null, true),
  ('ESCOLA_CIDADE', 'Cidade da escola', 'ESCOLA', 'TEXTO', 'escola.cidade', null, true)
on conflict (codigo) do update
set descricao = excluded.descricao,
    origem = excluded.origem,
    tipo = excluded.tipo,
    path_origem = excluded.path_origem,
    formato = excluded.formato,
    ativo = excluded.ativo;

-- 4) Colecao MATRICULA_PARCELAS (padrao canonical + alias)
insert into public.documentos_colecoes (codigo, nome, descricao, root_tipo, ordem, ativo)
values
  ('MATRICULA_PARCELAS', 'Matricula - Parcelas', 'Parcelas/mensalidades vinculadas a matricula', 'MATRICULA', 12, true)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    root_tipo = excluded.root_tipo,
    ordem = excluded.ordem,
    ativo = excluded.ativo;

with c as (
  select id from public.documentos_colecoes where codigo = 'MATRICULA_PARCELAS'
)
insert into public.documentos_colecoes_colunas (colecao_id, codigo, label, tipo, formato, ordem, ativo)
select
  c.id,
  v.codigo,
  v.label,
  v.tipo,
  v.formato,
  v.ordem,
  true
from c
cross join (values
  ('VENCIMENTO', 'Vencimento', 'DATA', 'DATA_CURTA', 10),
  ('DESCRICAO', 'Descricao', 'TEXTO', null, 20),
  ('VALOR_CENTAVOS', 'Valor (centavos)', 'NUMERICO', null, 25),
  ('VALOR', 'Valor', 'MONETARIO', 'BRL', 30),
  ('STATUS', 'Status', 'TEXTO', null, 40)
) as v(codigo, label, tipo, formato, ordem)
on conflict (colecao_id, codigo) do update
set label = excluded.label,
    tipo = excluded.tipo,
    formato = excluded.formato,
    ordem = excluded.ordem,
    ativo = true;

-- 5) Modelos: Contrato + Ficha
insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
select
  'Contrato — Matrícula Pagante (Padrão)',
  'v1.0',
  true,
  $$<h2>CONTRATO DE PRESTACAO DE SERVICOS - {{TITULO_CONTRATO}}</h2>
<p>Pelo presente instrumento, de um lado:</p>
<p><strong>{{ESCOLA_NOME}}</strong>, CNPJ n.o {{ESCOLA_CNPJ}}, com sede em {{ESCOLA_ENDERECO}}, {{ESCOLA_CIDADE}}, doravante chamada CONTRATADA;</p>
<p>E, de outro:</p>
<p><strong>{{RESP_FIN_NOME}}</strong>, CPF n.o {{RESP_FIN_CPF}}, responsavel pelo(a) aluno(a) {{ALUNO_NOME}}, doravante chamado CONTRATANTE;</p>
<p>Resolvem firmar o presente Contrato de {{TIPO_CONTRATO_DESCRICAO}}, que sera regido pelas clausulas seguintes:</p>
<h3>CLAUSULA 1 - DO OBJETO</h3>
<p>{{DESCRICAO_OBJETO}}</p>
<h3>CLAUSULA 2 - DO PROJETO/TURMA</h3>
<p>{{DESCRICAO_PEDAGOGICA}}</p>
<h3>CLAUSULA 3 - DOS VALORES</h3>
<p>{{DISCRIMINACAO_VALORES}}</p>
<h3>CLAUSULA 4 - DAS CONDICOES DE PAGAMENTO</h3>
<p>Multa de {{MULTA_PERCENTUAL}}% e juros de {{JUROS_DIARIO}}% ao dia.</p>
<h3>CLAUSULA 5 - DA RESCISAO</h3>
<p>{{REGRAS_CANCELAMENTO}}</p>
<h3>CLAUSULA 6 - DIREITO DE IMAGEM (Obrigatorio em PROJETO_ARTISTICO)</h3>
<p>Texto padrao.</p>
<h3>CLAUSULA 7 - VIGENCIA</h3>
<p>{{TURMA_DATA_INICIO}} a {{TURMA_DATA_FIM}}</p>
<h3>CLAUSULA 8 - DISPOSICOES GERAIS</h3>
<p>...</p>
<p>Assinatura:</p>
<p>{{RESP_FIN_NOME}} - {{DATA_ASSINATURA}}</p>$$,
  '[]'::jsonb,
  'Modelo base para contrato de matricula pagante.'
where not exists (
  select 1 from public.documentos_modelo where titulo = 'Contrato — Matrícula Pagante (Padrão)'
);

insert into public.documentos_modelo (titulo, versao, ativo, texto_modelo_md, placeholders_schema_json, observacoes)
select
  'Ficha Financeira — Matrícula Pagante',
  'v1.0',
  true,
  $$<h2>FICHA FINANCEIRA - MATRICULA PAGANTE</h2>
<p><strong>Escola:</strong> {{ESCOLA_NOME}} (CNPJ {{ESCOLA_CNPJ}})</p>
<p><strong>Endereco:</strong> {{ESCOLA_ENDERECO}} - {{ESCOLA_CIDADE}}</p>
<p><strong>Aluno(a):</strong> {{ALUNO_NOME}} (CPF {{ALUNO_CPF}})</p>
<p><strong>Responsavel financeiro:</strong> {{RESP_FIN_NOME}} (CPF {{RESP_FIN_CPF}})</p>
<p><strong>Matricula:</strong> #{{MATRICULA_ID}} - {{MATRICULA_STATUS}} - {{MATRICULA_TIPO}}</p>
<p><strong>Ano:</strong> {{MATRICULA_ANO}} - <strong>Data:</strong> {{MATRICULA_DATA}}</p>
<p><strong>Turma:</strong> {{CURSO_NOME}} | {{TURMA_TIPO}} | {{TURMA_NIVEL}} | {{TURMA_TURNO}}</p>
<p><strong>Periodo:</strong> {{TURMA_DATA_INICIO}} a {{TURMA_DATA_FIM}}</p>
<hr />
<h3>Resumo financeiro</h3>
<ul>
  <li>Valor total contratado: {{VALOR_TOTAL_CONTRATADO}}</li>
  <li>Valor mensalidade: {{VALOR_MENSALIDADE}}</li>
  <li>Valor matricula: {{VALOR_MATRICULA}}</li>
  <li>Numero de parcelas: {{NUMERO_PARCELAS}}</li>
  <li>Dia de vencimento: {{DIA_VENCIMENTO}}</li>
</ul>
<h3>Parcelas</h3>
<table border="1" cellspacing="0" cellpadding="6">
  <thead>
    <tr>
      <th>Vencimento</th>
      <th>Descricao</th>
      <th>Valor</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {{#MATRICULA_PARCELAS}}
    <tr>
      <td>{{VENCIMENTO}}</td>
      <td>{{DESCRICAO}}</td>
      <td>{{VALOR}}</td>
      <td>{{STATUS}}</td>
    </tr>
    {{/MATRICULA_PARCELAS}}
  </tbody>
</table>$$,
  '[]'::jsonb,
  'Modelo base para ficha financeira da matricula pagante.'
where not exists (
  select 1 from public.documentos_modelo where titulo = 'Ficha Financeira — Matrícula Pagante'
);

-- 6) Vinculo conjunto/grupo (MATRICULA_REGULAR / DOCUMENTO_PRINCIPAL)
with g as (
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
  where titulo = 'Contrato — Matrícula Pagante (Padrão)'
  order by id desc
  limit 1
),
m_ficha as (
  select id as modelo_id
  from public.documentos_modelo
  where titulo = 'Ficha Financeira — Matrícula Pagante'
  order by id desc
  limit 1
)
insert into public.documentos_conjuntos_grupos_modelos (conjunto_grupo_id, modelo_id, ordem, ativo)
select g.grupo_id, m.modelo_id, 1, true
from g
join m_contrato m on true
where not exists (
  select 1
  from public.documentos_conjuntos_grupos_modelos x
  where x.conjunto_grupo_id = g.grupo_id
    and x.modelo_id = m.modelo_id
);

insert into public.documentos_conjuntos_grupos_modelos (conjunto_grupo_id, modelo_id, ordem, ativo)
select g.grupo_id, m.modelo_id, 2, true
from g
join m_ficha m on true
where not exists (
  select 1
  from public.documentos_conjuntos_grupos_modelos x
  where x.conjunto_grupo_id = g.grupo_id
    and x.modelo_id = m.modelo_id
);

commit;

select pg_notify('pgrst', 'reload schema');
