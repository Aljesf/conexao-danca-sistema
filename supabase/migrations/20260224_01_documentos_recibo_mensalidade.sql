begin;

-- 1) Garantir tipo RECIBO em documentos_tipos
insert into public.documentos_tipos (codigo, nome, descricao, ativo)
values (
  'RECIBO',
  'Recibo',
  'Comprovante de operacao financeira.',
  true
)
on conflict (codigo) do update
set nome = excluded.nome,
    descricao = excluded.descricao,
    ativo = true,
    updated_at = now();

-- 2) Inserir/atualizar modelo RECIBO_MENSALIDADE em documentos_modelo
--    Observacao: o schema atual nao possui coluna "codigo" em documentos_modelo.
--    Por isso, usamos marcador tecnico em observacoes para lookup idempotente.
do $$
declare
  v_tipo_id bigint;
  v_modelo_id bigint;
  v_titulo text := 'Recibo de Pagamento de Mensalidade';
  v_versao text := 'v1.0';
  v_modelo_md text := $txt$
RECIBO DE PAGAMENTO DE MENSALIDADE

Recebemos de: {{PAGADOR_NOME}} (CPF: {{PAGADOR_CPF}})
Referente ao(a) aluno(a): {{ALUNO_NOME}}
Competencia: {{COMPETENCIA}}
Referencia: {{REFERENCIA}}

Valor pago: {{VALOR}}
Forma de pagamento: {{FORMA_PAGAMENTO}}
Data do pagamento: {{DATA_PAGAMENTO}}

Declaro(amos) para os devidos fins que o valor acima foi recebido.

{{CIDADE_DATA}}

____________________________________
{{ESCOLA_NOME}}
$txt$;
  v_observacoes text := '[CODIGO:RECIBO_MENSALIDADE] Modelo padrao para emissao de recibo de mensalidade.';
begin
  select tipo_documento_id
    into v_tipo_id
  from public.documentos_tipos
  where codigo = 'RECIBO'
  limit 1;

  select id
    into v_modelo_id
  from public.documentos_modelo
  where (observacoes ilike '%RECIBO_MENSALIDADE%')
     or (upper(titulo) = upper(v_titulo))
  order by id desc
  limit 1;

  if v_modelo_id is null then
    insert into public.documentos_modelo (
      titulo,
      versao,
      ativo,
      texto_modelo_md,
      placeholders_schema_json,
      observacoes,
      formato,
      tipo_documento_id,
      updated_at
    )
    values (
      v_titulo,
      v_versao,
      true,
      v_modelo_md,
      '[]'::jsonb,
      v_observacoes,
      'MARKDOWN',
      v_tipo_id,
      now()
    )
    returning id into v_modelo_id;
  else
    update public.documentos_modelo
       set titulo = v_titulo,
           versao = v_versao,
           ativo = true,
           texto_modelo_md = v_modelo_md,
           observacoes = v_observacoes,
           formato = 'MARKDOWN',
           tipo_documento_id = v_tipo_id,
           updated_at = now()
     where id = v_modelo_id;
  end if;
end
$$;

commit;
