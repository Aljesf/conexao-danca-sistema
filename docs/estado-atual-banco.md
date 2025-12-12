# Estado Atual do Banco de Dados - Conexao Danca
# Versao: 2025-12-12
# Fonte: schema-supabase.sql (snapshot real)

> Snapshot atualizado; recorte do Credito Conexao em docs/snippets/schema-credito-conexao.md.
> Este documento descreve **o estado real do banco**. Modelos conceituais e documentos antigos servem como referencia historica, mas a verdade oficial esta aqui e no snapshot atual do schema.

---

## 1. VisÃ£o Geral
- DomÃ­nios presentes: Pessoas/Identidade, Colaboradores/Professores, AcadÃªmico (Cursos/Turmas/AvaliaÃ§Ãµes), MatrÃ­culas (implementaÃ§Ã£o real), Financeiro, Loja, AdministraÃ§Ã£o/Auditoria.
- Tabelas **canÃ´nicas**: `pessoas`, `profiles`, `pessoas_roles`, `centros_custo`, `plano_contas`, `categorias_financeiras`, `contas_financeiras`, `cobrancas`, `recebimentos`, `contas_pagar`, `contas_pagar_pagamentos`, `movimento_financeiro`, `matriculas`, `turma_aluno`, `turmas`, `cursos`, `niveis`, `modulos`, `habilidades`, `avaliacoes_*`.
- Tabelas **legadas** (manter, mas planejar desativaÃ§Ã£o): `alunos`, `alunos_turmas`, `endereco`, `enderecos`, campos JSON de endereÃ§o em `pessoas`.
- Loja v0 estÃ¡ materializada em tabelas prÃ³prias (vide seÃ§Ã£o 7) e jÃ¡ integra parcialmente financeiro/estoque.

---

## 2. DomÃ­nio Pessoas / Identidade
- **pessoas**: pessoa fÃ­sica/jurÃ­dica, com `cpf`, `cnpj`, `nome_social`, `nome_fantasia`, `razao_social`, `telefone`, `telefone_secundario`, `email`, `tipo_pessoa`, `ativo`, `genero`, `estado_civil`, `foto_url`, `neofin_customer_id`, `created_by/updated_by` â†’ FKs para `profiles`/`auth.users`. Possui `endereco_id` (FK para `enderecos`) e campo legado `endereco` (jsonb).
- **profiles**: perfil do usuÃ¡rio (um para um com auth.users), `pessoa_id` UNIQUE.
- **pessoas_roles**: vincula papÃ©is de domÃ­nio a pessoas.
- EndereÃ§os:
  - **enderecos_pessoa** (canÃ´nico atual): FK para `pessoas`, `ruas`, `bairros`; campos de logradouro livres.
  - **enderecos**, **ruas**, **bairros**: dicionÃ¡rios canÃ´nicos de endereÃ§o.
  - **endereco** (singular) e campo json em `pessoas`: legados.

---

## 3. DomÃ­nio Colaboradores / Professores
- **colaboradores**: FK para `pessoas`, opcional `centro_custo_id`, `tipo_vinculo`, datas, ativo.
- **funcoes_colaborador**, **funcoes_grupo**, **colaborador_funcoes**: cargos e funÃ§Ãµes.
- **tipos_vinculo_colaborador**, **config_pagamento_colaborador**, **modelos_pagamento_colaborador**: regras de vÃ­nculo e pagamento.
- **colaborador_jornada**, **colaborador_jornada_dias**: jornada de trabalho.
- **professores**: FK para `colaboradores`, `tipos_professor`.

---

## 4. DomÃ­nio AcadÃªmico / Turmas / AvaliaÃ§Ãµes
- CatÃ¡logo acadÃªmico: **cursos**, **niveis**, **modulos**, **habilidades**.
- Turmas: **turmas** (campos: `tipo_turma`, `turno`, `status`, datas, carga horÃ¡ria, observaÃ§Ãµes), **turmas_horarios**.
- RelaÃ§Ãµes turma-professor: **turma_professores**.
- AvaliaÃ§Ãµes: **avaliacoes_conceitos**, **avaliacoes_modelo**, **turma_avaliacoes**, **avaliacao_aluno_resultado** (FKs para `pessoas`, `colaboradores`, `avaliacoes_conceitos`).

---

## 5. DomÃ­nio MatrÃ­culas / Alunos / VÃ­nculos (ImplementaÃ§Ã£o Real)
- **matriculas** (canÃ´nica): `pessoa_id`, `responsavel_financeiro_id`, `tipo_matricula`, `vinculo_id` (FK `turmas.turma_id`), `plano_matricula_id`, `contrato_modelo_id`, `contrato_emitido_id`, `status`, `ano_referencia`, `data_matricula`, `observacoes`, timestamps e audit.
- **turma_aluno** (canÃ´nica): `aluno_pessoa_id` (FK `pessoas`), `turma_id` (FK `turmas`), `matricula_id` (FK `matriculas`), datas inÃ­cio/fim, `status`.
- **vinculos**: relaciona aluno â†” responsÃ¡vel (ambos `pessoas`), `parentesco`.
- Legado: **alunos**, **alunos_turmas** (devem ser mantidos apenas para compatibilidade, nÃ£o usar em fluxos novos).
- Nota: A implementaÃ§Ã£o real de matrÃ­culas e turma_aluno evoluiu alÃ©m do modelo conceitual antigo; este estado real Ã© a referÃªncia oficial.

---

## 6. DomÃ­nio Financeiro
- DicionÃ¡rios: **centros_custo**, **plano_contas**, **categorias_financeiras**, **contas_financeiras**.
- Contas a receber: **cobrancas** (`pessoa_id`, `valor_centavos`, `vencimento`, `status`, `centro_custo_id`, `origem_tipo`, `origem_id`, meios de pagamento).
- Recebimentos: **recebimentos** (FK `cobranca_id`, `centro_custo_id`, valor, data, `metodo_pagamento`, `origem_sistema`).
- Contas a pagar: **contas_pagar** (FK `centro_custo_id`, `categoria_id`, `pessoa_id`, `valor_centavos`, `vencimento`, `status`, `metodo_pagamento`, audit).
- Pagamentos: **contas_pagar_pagamentos** (FK `conta_pagar_id`, `centro_custo_id`, `conta_financeira_id`, valores principal/juros/desconto, data, audit).
- Movimento financeiro: **movimento_financeiro** (tipo DESPESA/RECEITA, `centro_custo_id`, valor, data, `origem`, `origem_id`).

---

## 7. DomÃ­nio Loja (ImplementaÃ§Ã£o Real)
- Produtos e fornecedores:
  - **loja_produtos**: `codigo`, `nome`, `descricao`, `categoria`, `preco_venda_centavos`, `unidade`, `estoque_atual`, `ativo`, `observacoes`, timestamps; opcional `fornecedor_principal_id`.
  - **loja_fornecedores**: FK `pessoa_id`, `codigo_interno`, `ativo`, `observacoes`, timestamps.
  - **loja_fornecedor_precos**: histÃ³rico de custos por fornecedor/produto.
- Vendas:
  - **loja_vendas**: `cliente_pessoa_id`, `tipo_venda` (VENDA/CREDIARIO_INTERNO/ENTREGA_FIGURINO), `valor_total_centavos`, `desconto_centavos`, `forma_pagamento`, `status_pagamento`, `status_venda`, datas, observaÃ§Ãµes, `vendedor_user_id`, `cobranca_id`, timestamps.
  - **loja_venda_itens**: `venda_id`, `produto_id`, `quantidade`, `preco_unitario_centavos`, `total_centavos`, `beneficiario_pessoa_id`, `observacoes`.
  - **loja_estoque_movimentos** (quando presente): `produto_id`, `tipo` (ENTRADA/SAIDA/AJUSTE), `quantidade`, `origem` (VENDA/CANCELAMENTO_VENDA/COMPRA/AJUSTE_MANUAL), `referencia_id`, `observacao`, `created_by`, `created_at`.
- Compras:
  - **loja_pedidos_compra**: `fornecedor_id`, `data_pedido`, `status` (RASCUNHO/EM_ANDAMENTO/PARCIAL/CONCLUIDO/CANCELADO), `valor_estimado_centavos`, `observacoes`, timestamps, `created_by/updated_by`, `conta_pagar_id`.
  - **loja_pedidos_compra_itens**: `pedido_id`, `produto_id`, `quantidade_solicitada`, `quantidade_recebida`, `preco_custo_centavos`, `observacoes`.
  - **loja_pedidos_compra_recebimentos**: `pedido_id`, `item_id`, `produto_id`, `quantidade_recebida`, `preco_custo_centavos`, `data_recebimento`, `observacao`, `created_by`, `created_at`.
- IntegraÃ§Ãµes atuais:
  - Vendas podem gerar `cobrancas`/`recebimentos` (crediÃ¡rio interno, vendas Ã  vista com liquidaÃ§Ã£o).
  - Compras podem preencher `conta_pagar_id` e atualizar `contas_pagar`/`contas_pagar_pagamentos`; pagamentos geram `movimento_financeiro` (despesa).
  - Estoque: saÃ­das em vendas, entradas em cancelamento/recebimentos de compra/ajuste manual.

---

## 8. AdministraÃ§Ã£o / Auditoria / SeguranÃ§a
- **roles_sistema**, **usuario_roles**: papÃ©is e vÃ­nculos de usuÃ¡rios.
- **auditoria_logs**: aÃ§Ãµes com `user_id`, `acao`, `entidade`, `detalhes`, `ip`, `user_agent`.
- ConfiguraÃ§Ã£o/integraÃ§Ã£o: ver docs de VNB e rotas Admin (nÃ£o hÃ¡ tabelas especÃ­ficas alÃ©m de dicionÃ¡rios jÃ¡ listados).

---

## 9. ðŸ“Œ DiferenÃ§as entre Modelo Conceitual e ImplementaÃ§Ã£o Real Atual

### MatrÃ­culas
- ImplementaÃ§Ã£o real usa `matriculas` (canÃ´nica) + `turma_aluno` com FK explÃ­cita para `matriculas` e `pessoas`, status e datas; supera o modelo conceitual antigo.
- ResponsÃ¡vel financeiro e aluno sÃ£o pessoas distintas; vÃ­nculo para turma via `vinculo_id` (turma) e `matricula_id` em `turma_aluno`.
- O estado atual Ã© a **fonte oficial**; nÃ£o reverter para o modelo legado (`alunos`, `alunos_turmas`).

### Loja
- ImplementaÃ§Ã£o real inclui vendas, itens, estoque, compras, fornecedores, histÃ³rico de custos e integraÃ§Ãµes financeiras (cobrancas/contas_pagar/movimento_financeiro), indo alÃ©m do modelo-loja-v0.md.
- BeneficiÃ¡rio por item, crediÃ¡rio interno com cobranÃ§a, compras com conta a pagar e movimentos de estoque.  
- O modelo-loja-v0.md Ã© histÃ³rico; a implementaÃ§Ã£o atual prevalece.

### Outros mÃ³dulos
- EndereÃ§os: modelo real usa `enderecos`/`ruas`/`bairros` + `enderecos_pessoa`; modelos antigos de endereÃ§o permanecem apenas por compatibilidade.
- AvaliaÃ§Ãµes e currÃ­culo: estruturas reais de avaliaÃ§Ãµes/habilidades/turma_avaliacoes podem divergir de versÃµes conceituais; priorizar o schema atual.

**ConclusÃ£o:** As diferenÃ§as sÃ£o evoluÃ§Ãµes naturais e refletem a realidade do sistema; o estado atual deve sempre prevalecer sobre modelos antigos.

---

## 10. Resumo para Futuras RefatoraÃ§Ãµes
- Partir SEMPRE do schema real (snapshot atual) e deste documento.
- Planejar descontinuaÃ§Ã£o de tabelas legadas (`alunos`, `alunos_turmas`, `endereco`, `enderecos`, campo json em `pessoas`).
- Consolidar integraÃ§Ãµes Financeiro â†” Loja (cobranÃ§as/recebimentos e contas_pagar/pagamentos) e Estoque â†” Loja (movimentos automÃ¡ticos).
- Manter MatrÃ­culas e Turma_Aluno como canÃ´nicos; evitar regressÃ£o para modelos antigos.

---

## 11. RodapÃ©
- Data do snapshot: 2025-12-12.
- Esta versÃ£o substitui completamente qualquer versÃ£o anterior de `docs/estado-atual-banco.md`. Atualize novamente apÃ³s mudanÃ§as relevantes no schema.


