# 📘 Estado Atual do Banco de Dados — Conexão Dança  
# Versão: 2026-06-17  
# Fonte: schema-supabase.sql (snapshot real)

> Este documento descreve **o estado real do banco**. Modelos conceituais e documentos antigos servem como referência histórica, mas a verdade oficial está aqui e no snapshot atual do schema.

---

## 1. Visão Geral
- Domínios presentes: Pessoas/Identidade, Colaboradores/Professores, Acadêmico (Cursos/Turmas/Avaliações), Matrículas (implementação real), Financeiro, Loja, Administração/Auditoria.
- Tabelas **canônicas**: `pessoas`, `profiles`, `pessoas_roles`, `centros_custo`, `plano_contas`, `categorias_financeiras`, `contas_financeiras`, `cobrancas`, `recebimentos`, `contas_pagar`, `contas_pagar_pagamentos`, `movimento_financeiro`, `matriculas`, `turma_aluno`, `turmas`, `cursos`, `niveis`, `modulos`, `habilidades`, `avaliacoes_*`.
- Tabelas **legadas** (manter, mas planejar desativação): `alunos`, `alunos_turmas`, `endereco`, `enderecos`, campos JSON de endereço em `pessoas`.
- Loja v0 está materializada em tabelas próprias (vide seção 7) e já integra parcialmente financeiro/estoque.

---

## 2. Domínio Pessoas / Identidade
- **pessoas**: pessoa física/jurídica, com `cpf`, `cnpj`, `nome_social`, `nome_fantasia`, `razao_social`, `telefone`, `telefone_secundario`, `email`, `tipo_pessoa`, `ativo`, `genero`, `estado_civil`, `foto_url`, `neofin_customer_id`, `created_by/updated_by` → FKs para `profiles`/`auth.users`. Possui `endereco_id` (FK para `enderecos`) e campo legado `endereco` (jsonb).
- **profiles**: perfil do usuário (um para um com auth.users), `pessoa_id` UNIQUE.
- **pessoas_roles**: vincula papéis de domínio a pessoas.
- Endereços:
  - **enderecos_pessoa** (canônico atual): FK para `pessoas`, `ruas`, `bairros`; campos de logradouro livres.
  - **enderecos**, **ruas**, **bairros**: dicionários canônicos de endereço.
  - **endereco** (singular) e campo json em `pessoas`: legados.

---

## 3. Domínio Colaboradores / Professores
- **colaboradores**: FK para `pessoas`, opcional `centro_custo_id`, `tipo_vinculo`, datas, ativo.
- **funcoes_colaborador**, **funcoes_grupo**, **colaborador_funcoes**: cargos e funções.
- **tipos_vinculo_colaborador**, **config_pagamento_colaborador**, **modelos_pagamento_colaborador**: regras de vínculo e pagamento.
- **colaborador_jornada**, **colaborador_jornada_dias**: jornada de trabalho.
- **professores**: FK para `colaboradores`, `tipos_professor`.

---

## 4. Domínio Acadêmico / Turmas / Avaliações
- Catálogo acadêmico: **cursos**, **niveis**, **modulos**, **habilidades**.
- Turmas: **turmas** (campos: `tipo_turma`, `turno`, `status`, datas, carga horária, observações), **turmas_horarios**.
- Relações turma-professor: **turma_professores**.
- Avaliações: **avaliacoes_conceitos**, **avaliacoes_modelo**, **turma_avaliacoes**, **avaliacao_aluno_resultado** (FKs para `pessoas`, `colaboradores`, `avaliacoes_conceitos`).

---

## 5. Domínio Matrículas / Alunos / Vínculos (Implementação Real)
- **matriculas** (canônica): `pessoa_id`, `responsavel_financeiro_id`, `tipo_matricula`, `vinculo_id` (FK `turmas.turma_id`), `plano_matricula_id`, `contrato_modelo_id`, `contrato_emitido_id`, `status`, `ano_referencia`, `data_matricula`, `observacoes`, timestamps e audit.
- **turma_aluno** (canônica): `aluno_pessoa_id` (FK `pessoas`), `turma_id` (FK `turmas`), `matricula_id` (FK `matriculas`), datas início/fim, `status`.
- **vinculos**: relaciona aluno ↔ responsável (ambos `pessoas`), `parentesco`.
- Legado: **alunos**, **alunos_turmas** (devem ser mantidos apenas para compatibilidade, não usar em fluxos novos).
- Nota: A implementação real de matrículas e turma_aluno evoluiu além do modelo conceitual antigo; este estado real é a referência oficial.

---

## 6. Domínio Financeiro
- Dicionários: **centros_custo**, **plano_contas**, **categorias_financeiras**, **contas_financeiras**.
- Contas a receber: **cobrancas** (`pessoa_id`, `valor_centavos`, `vencimento`, `status`, `centro_custo_id`, `origem_tipo`, `origem_id`, meios de pagamento).
- Recebimentos: **recebimentos** (FK `cobranca_id`, `centro_custo_id`, valor, data, `metodo_pagamento`, `origem_sistema`).
- Contas a pagar: **contas_pagar** (FK `centro_custo_id`, `categoria_id`, `pessoa_id`, `valor_centavos`, `vencimento`, `status`, `metodo_pagamento`, audit).
- Pagamentos: **contas_pagar_pagamentos** (FK `conta_pagar_id`, `centro_custo_id`, `conta_financeira_id`, valores principal/juros/desconto, data, audit).
- Movimento financeiro: **movimento_financeiro** (tipo DESPESA/RECEITA, `centro_custo_id`, valor, data, `origem`, `origem_id`).

---

## 7. Domínio Loja (Implementação Real)
- Produtos e fornecedores:
  - **loja_produtos**: `codigo`, `nome`, `descricao`, `categoria`, `preco_venda_centavos`, `unidade`, `estoque_atual`, `ativo`, `observacoes`, timestamps; opcional `fornecedor_principal_id`.
  - **loja_fornecedores**: FK `pessoa_id`, `codigo_interno`, `ativo`, `observacoes`, timestamps.
  - **loja_fornecedor_precos**: histórico de custos por fornecedor/produto.
- Vendas:
  - **loja_vendas**: `cliente_pessoa_id`, `tipo_venda` (VENDA/CREDIARIO_INTERNO/ENTREGA_FIGURINO), `valor_total_centavos`, `desconto_centavos`, `forma_pagamento`, `status_pagamento`, `status_venda`, datas, observações, `vendedor_user_id`, `cobranca_id`, timestamps.
  - **loja_venda_itens**: `venda_id`, `produto_id`, `quantidade`, `preco_unitario_centavos`, `total_centavos`, `beneficiario_pessoa_id`, `observacoes`.
  - **loja_estoque_movimentos** (quando presente): `produto_id`, `tipo` (ENTRADA/SAIDA/AJUSTE), `quantidade`, `origem` (VENDA/CANCELAMENTO_VENDA/COMPRA/AJUSTE_MANUAL), `referencia_id`, `observacao`, `created_by`, `created_at`.
- Compras:
  - **loja_pedidos_compra**: `fornecedor_id`, `data_pedido`, `status` (RASCUNHO/EM_ANDAMENTO/PARCIAL/CONCLUIDO/CANCELADO), `valor_estimado_centavos`, `observacoes`, timestamps, `created_by/updated_by`, `conta_pagar_id`.
  - **loja_pedidos_compra_itens**: `pedido_id`, `produto_id`, `quantidade_solicitada`, `quantidade_recebida`, `preco_custo_centavos`, `observacoes`.
  - **loja_pedidos_compra_recebimentos**: `pedido_id`, `item_id`, `produto_id`, `quantidade_recebida`, `preco_custo_centavos`, `data_recebimento`, `observacao`, `created_by`, `created_at`.
- Integrações atuais:
  - Vendas podem gerar `cobrancas`/`recebimentos` (crediário interno, vendas à vista com liquidação).
  - Compras podem preencher `conta_pagar_id` e atualizar `contas_pagar`/`contas_pagar_pagamentos`; pagamentos geram `movimento_financeiro` (despesa).
  - Estoque: saídas em vendas, entradas em cancelamento/recebimentos de compra/ajuste manual.

---

## 8. Administração / Auditoria / Segurança
- **roles_sistema**, **usuario_roles**: papéis e vínculos de usuários.
- **auditoria_logs**: ações com `user_id`, `acao`, `entidade`, `detalhes`, `ip`, `user_agent`.
- Configuração/integração: ver docs de VNB e rotas Admin (não há tabelas específicas além de dicionários já listados).

---

## 9. 📌 Diferenças entre Modelo Conceitual e Implementação Real Atual

### Matrículas
- Implementação real usa `matriculas` (canônica) + `turma_aluno` com FK explícita para `matriculas` e `pessoas`, status e datas; supera o modelo conceitual antigo.
- Responsável financeiro e aluno são pessoas distintas; vínculo para turma via `vinculo_id` (turma) e `matricula_id` em `turma_aluno`.
- O estado atual é a **fonte oficial**; não reverter para o modelo legado (`alunos`, `alunos_turmas`).

### Loja
- Implementação real inclui vendas, itens, estoque, compras, fornecedores, histórico de custos e integrações financeiras (cobrancas/contas_pagar/movimento_financeiro), indo além do modelo-loja-v0.md.
- Beneficiário por item, crediário interno com cobrança, compras com conta a pagar e movimentos de estoque.  
- O modelo-loja-v0.md é histórico; a implementação atual prevalece.

### Outros módulos
- Endereços: modelo real usa `enderecos`/`ruas`/`bairros` + `enderecos_pessoa`; modelos antigos de endereço permanecem apenas por compatibilidade.
- Avaliações e currículo: estruturas reais de avaliações/habilidades/turma_avaliacoes podem divergir de versões conceituais; priorizar o schema atual.

**Conclusão:** As diferenças são evoluções naturais e refletem a realidade do sistema; o estado atual deve sempre prevalecer sobre modelos antigos.

---

## 10. Resumo para Futuras Refatorações
- Partir SEMPRE do schema real (snapshot atual) e deste documento.
- Planejar descontinuação de tabelas legadas (`alunos`, `alunos_turmas`, `endereco`, `enderecos`, campo json em `pessoas`).
- Consolidar integrações Financeiro ↔ Loja (cobranças/recebimentos e contas_pagar/pagamentos) e Estoque ↔ Loja (movimentos automáticos).
- Manter Matrículas e Turma_Aluno como canônicos; evitar regressão para modelos antigos.

---

## 11. Rodapé
- Data do snapshot: 2026-06-17.
- Esta versão substitui completamente qualquer versão anterior de `docs/estado-atual-banco.md`. Atualize novamente após mudanças relevantes no schema.
