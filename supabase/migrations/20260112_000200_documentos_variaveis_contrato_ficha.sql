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
  $$<h2>CONTRATO DE PRESTAÇÃO DE SERVIÇOS EDUCACIONAIS</h2>
<h3>MATRÍCULA — ENSINO ARTÍSTICO, CULTURAL E CORPORAL</h3>

<p>
Pelo presente instrumento particular, de um lado <strong>{{ESCOLA_NOME}}</strong>,
pessoa jurídica de direito privado, inscrita no CNPJ sob nº <strong>{{ESCOLA_CNPJ}}</strong>,
instituição de ensino artístico, cultural e corporal, doravante denominada <strong>INSTITUIÇÃO</strong>,
e, de outro lado, <strong>{{RESP_FIN_NOME}}</strong>, inscrito(a) no CPF nº <strong>{{ALUNO_CPF}}</strong>,
responsável legal e financeiro pelo(a) aluno(a) <strong>{{ALUNO_NOME}}</strong>, doravante denominado(a)
<strong>CONTRATANTE</strong>, resolvem firmar o presente Contrato de Prestação de Serviços Educacionais,
que se regerá pelas cláusulas seguintes.
</p>

<h4>CLÁUSULA PRIMEIRA — DO OBJETO</h4>
<p>
1.1. O presente contrato tem por objeto a prestação de serviços educacionais na área de ensino artístico,
cultural e corporal, compreendendo aulas, treinos, ensaios e atividades pedagógicas, conforme modalidade,
curso, nível, turma e organização definidos no ato da matrícula.
</p>
<p>
1.2. A matrícula formaliza o vínculo educacional entre as partes, garantindo ao(à) aluno(a) o direito de
frequentar as atividades correspondentes enquanto vigente a matrícula.
</p>
<p>
1.3. Para efeitos de referência no sistema, esta matrícula integra o ano letivo <strong>{{MATRICULA_ANO}}</strong>
e está vinculada à turma/curso <strong>{{CURSO_NOME}}</strong>.
</p>

<h4>CLÁUSULA SEGUNDA — DA VIGÊNCIA</h4>
<p>
2.1. O presente contrato entra em vigor na data de sua assinatura e terá vigência durante todo o período
de validade da matrícula do(a) aluno(a), permanecendo ativo enquanto houver vínculo educacional vigente com
a INSTITUIÇÃO.
</p>
<p>
2.2. O contrato será automaticamente encerrado com a conclusão regular da matrícula, com o cancelamento ou
trancamento (nos termos das Regras Oficiais de Matrícula) ou com o encerramento do curso/turma, quando aplicável.
</p>

<h4>CLÁUSULA TERCEIRA — DA ORGANIZAÇÃO PEDAGÓGICA</h4>
<p>
3.1. As aulas e atividades serão ministradas conforme os dias, horários, modalidade, nível e turma definidos
na matrícula, os quais integram este contrato por referência.
</p>
<p>
3.2. Não haverá aulas nos feriados nacionais, estaduais ou municipais, nem reposição automática desses dias,
salvo deliberação expressa da INSTITUIÇÃO.
</p>

<h4>CLÁUSULA QUARTA — DA FREQUÊNCIA, CONDUTA E DISCIPLINA</h4>
<p>
4.1. A frequência e a pontualidade são essenciais para o aproveitamento pedagógico e artístico do(a) aluno(a).
</p>
<p>
4.2. A ausência do(a) aluno(a), ainda que justificada, não gera direito a desconto, por se tratar de serviço
educacional de natureza continuada, conforme regulamento interno.
</p>

<h4>CLÁUSULA QUINTA — DO REGULAMENTO INTERNO</h4>
<p>
5.1. O CONTRATANTE declara ter pleno conhecimento do Regulamento Interno da INSTITUIÇÃO, comprometendo-se a
cumpri-lo integralmente.
</p>

<h4>CLÁUSULA SEXTA — DAS OBRIGAÇÕES DA INSTITUIÇÃO</h4>
<p>
6.1. Compete à INSTITUIÇÃO oferecer ensino de qualidade, manter ambiente seguro e comunicar orientações relevantes,
respeitando a privacidade e os dados pessoais.
</p>

<h4>CLÁUSULA SÉTIMA — DAS OBRIGAÇÕES DO(A) ALUNO(A) E DO CONTRATANTE</h4>
<p>
7.1. Compete ao(à) aluno(a) e ao CONTRATANTE cumprir este contrato, zelar pelas instalações e informar condições
de saúde relevantes.
</p>

<h4>CLÁUSULA DÉCIMA PRIMEIRA — DOS VALORES, PARCELAS E FORMA DE PAGAMENTO</h4>
<p>
11.1. Os valores contratados, número de parcelas e forma de pagamento são definidos no momento da matrícula e
registrados no sistema.
</p>
<p>
11.2. Valor total contratado (snapshot): <strong>{{VALOR_TOTAL_CONTRATADO}}</strong>.
</p>
<p>
11.3. Os detalhes de cobrança, vencimentos e liquidação seguem o Cartão Conexão e as Regras Oficiais.
</p>

<h4>CLÁUSULA DÉCIMA SÉTIMA — DO FORO</h4>
<p>
17.1. Fica eleito o foro da comarca de assinatura do contrato para dirimir quaisquer controvérsias oriundas deste contrato.
</p>

<p>
E, por estarem de pleno acordo, firmam o presente instrumento.
</p>

<p style="margin-top:24px;">
<strong>CONTRATANTE:</strong> {{RESP_FIN_NOME}}<br/>
<strong>ALUNO(A):</strong> {{ALUNO_NOME}}
</p>$$,
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
  $$<h2>FICHA FINANCEIRA — MATRÍCULA</h2>

<p><strong>Aluno(a):</strong> {{ALUNO_NOME}}</p>
<p><strong>CPF do(a) aluno(a):</strong> {{ALUNO_CPF}}</p>
<p><strong>Responsável financeiro:</strong> {{RESP_FIN_NOME}}</p>
<p><strong>Curso/Turma:</strong> {{CURSO_NOME}}</p>
<p><strong>Ano de referência:</strong> {{MATRICULA_ANO}}</p>
<p><strong>Valor total contratado (snapshot):</strong> {{VALOR_TOTAL_CONTRATADO}}</p>

<hr/>

<h3>Lançamentos de Crédito — Matrícula</h3>
<table style="width:100%; border-collapse:collapse;" border="1" cellpadding="6">
  <thead>
    <tr>
      <th style="width:18%;">Data</th>
      <th>Descrição</th>
      <th style="width:18%;">Valor</th>
      <th style="width:18%;">Status</th>
    </tr>
  </thead>
  <tbody>
    {{#MATRICULA_LANCAMENTOS_CREDITO}}
    <tr>
      <td>{{DATA}}</td>
      <td>{{DESCRICAO}}</td>
      <td>{{VALOR}}</td>
      <td>{{STATUS}}</td>
    </tr>
    {{/MATRICULA_LANCAMENTOS_CREDITO}}
  </tbody>
</table>

<br/>
<h3>Entradas / Pró-rata</h3>
<table style="width:100%; border-collapse:collapse;" border="1" cellpadding="6">
  <thead>
    <tr>
      <th style="width:18%;">Data</th>
      <th>Descrição</th>
      <th style="width:18%;">Valor</th>
      <th style="width:18%;">Status</th>
    </tr>
  </thead>
  <tbody>
    {{#MATRICULA_ENTRADAS}}
    <tr>
      <td>{{DATA}}</td>
      <td>{{DESCRICAO}}</td>
      <td>{{VALOR}}</td>
      <td>{{STATUS}}</td>
    </tr>
    {{/MATRICULA_ENTRADAS}}
  </tbody>
</table>

<br/>
<h3>Parcelas / Mensalidades</h3>
<table style="width:100%; border-collapse:collapse;" border="1" cellpadding="6">
  <thead>
    <tr>
      <th style="width:18%;">Vencimento</th>
      <th>Descrição</th>
      <th style="width:18%;">Valor</th>
      <th style="width:18%;">Status</th>
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
</table>

<br/>
<h3>Lançamentos de Crédito — Fatura</h3>
<table style="width:100%; border-collapse:collapse;" border="1" cellpadding="6">
  <thead>
    <tr>
      <th style="width:18%;">Data</th>
      <th>Descrição</th>
      <th style="width:18%;">Valor</th>
      <th style="width:18%;">Status</th>
    </tr>
  </thead>
  <tbody>
    {{#FATURA_LANCAMENTOS_CREDITO}}
    <tr>
      <td>{{DATA}}</td>
      <td>{{DESCRICAO}}</td>
      <td>{{VALOR}}</td>
      <td>{{STATUS}}</td>
    </tr>
    {{/FATURA_LANCAMENTOS_CREDITO}}
  </tbody>
</table>$$,
  '[]'::jsonb,
  'Modelo base para ficha financeira da matricula pagante.'
where not exists (
  select 1 from public.documentos_modelo where titulo = 'Ficha Financeira — Matrícula Pagante'
);

-- ============================================================
-- Vínculo Grupo ↔ Modelos (principal) — CONTRATO + FICHA
-- (CTE precisa estar no MESMO comando do INSERT)
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
  select m.id as modelo_id
  from public.documentos_modelo m
  where m.titulo = 'Contrato — Matrícula Pagante (Padrão)'
  order by m.id desc
  limit 1
),
m_ficha as (
  select m.id as modelo_id
  from public.documentos_modelo m
  where m.titulo = 'Ficha Financeira — Matrícula Pagante'
  order by m.id desc
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
