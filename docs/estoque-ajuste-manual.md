📘 Estoque — Ajuste Manual (Regra Oficial)

Sistema Conexão Dança — AJ Dance Store  
Versão: 1.0  
Data: 2025-12-12  
Responsável: Alírio de Jesus e Silva Filho

1. Objetivo
-----------
Definir a regra oficial para Ajuste Manual de Estoque, garantindo:
- auditoria (rastro completo);
- justificativa obrigatória;
- consistência entre saldo atual e histórico;
- prevenção de edições "silenciosas" no estoque.

Regra de ouro: nunca “editar estoque” diretamente. Toda mudança deve gerar um movimento rastreável.

2. Princípios
-------------
- Estoque atual é resultado dos movimentos. O saldo em `loja_produtos.estoque_atual` deve refletir a soma dos movimentos válidos.
- Ajuste manual não é correção livre. É um evento real (extravio, avaria, inventário, etc.).
- Justificativa é obrigatória. Sem motivo + observação, o ajuste não é permitido.
- Ajuste manual não altera financeiro nem compras automaticamente. É do domínio físico do estoque.

3. Quando usar Ajuste Manual
----------------------------
3.1 Cenários típicos (saída)
- EXTRAVIO: produto perdido/extraviado.
- AVARIA: produto danificado/inutilizado.
- USO_INTERNO: consumo interno (escola/loja/café).
- INVENTARIO_NEGATIVO: contagem física menor do que o sistema.

3.2 Cenários típicos (entrada)
- INVENTARIO_POSITIVO: contagem física maior do que o sistema.
- CORRECAO_CADASTRO: erro confirmado em lançamento anterior (com justificativa).
- DEVOLUCAO: devolução ao estoque (quando aplicável).

4. Proibido (regra explícita)
-----------------------------
- Proibido editar `loja_produtos.estoque_atual` por interface como “corrigir número” sem gerar movimento.
- Proibido ajuste manual sem usuário responsável (`created_by`).
- Proibido ajuste manual sem motivo e sem observação.
- Proibido usar ajuste manual como “atalho” para finalizar compra/venda.

5. Modelo de Dados (mínimo)
---------------------------
5.1 Tabela base  
Movimentos são registrados em `public.loja_estoque_movimentos`.

Campos essenciais:
- produto_id
- tipo: ENTRADA | SAIDA | AJUSTE
- origem: COMPRA | VENDA | CANCELAMENTO_VENDA | AJUSTE_MANUAL
- quantidade (> 0)
- referencia_id (quando existir)
- observacao (obrigatória para AJUSTE_MANUAL)
- created_by (obrigatório)
- created_at

Campos recomendados:
- saldo_antes
- saldo_depois
- custo_unitario_centavos (especialmente em entradas por compra)

5.2 Motivo (recomendado como enum controlado)  
Para ajustes manuais, deve existir um campo controlado `motivo` (ou equivalente), com valores como:
- EXTRAVIO
- AVARIA
- USO_INTERNO
- INVENTARIO_POSITIVO
- INVENTARIO_NEGATIVO
- CORRECAO_CADASTRO
- DEVOLUCAO

Se motivo ainda não existir como coluna, a aplicação deve exigir que o usuário inclua o motivo no texto da observacao até a coluna ser criada.

6. Regra de Validação (backend)
-------------------------------
Para qualquer ajuste manual:
- quantidade obrigatória e > 0
- produto_id obrigatório
- tipo obrigatório (ENTRADA ou SAIDA; AJUSTE pode ser usado como rótulo técnico, mas a direção deve estar clara)
- origem fixo: AJUSTE_MANUAL
- motivo obrigatório (enum) OU motivo contido na observação (fallback temporário)
- observacao obrigatória (mínimo 10 caracteres sugerido)
- created_by obrigatório

Se faltar qualquer item → retornar erro e não gravar.

7. UI (padrão recomendado)
--------------------------
Local: `/admin/loja/estoque`

Botão: Ajuste manual de estoque

Campos:
- Produto (seleção)
- Direção: Entrada / Saída
- Quantidade
- Motivo (select)
- Observação (textarea obrigatória)

Ao confirmar:
- grava 1 movimento em `loja_estoque_movimentos` com origem = AJUSTE_MANUAL
- atualiza `loja_produtos.estoque_atual`
- exibe no histórico do produto (movimentos)

8. Auditoria e rastreabilidade
------------------------------
O ajuste manual deve ficar claramente visível no histórico:
- data/hora
- usuário responsável
- motivo + observação
- saldo antes/depois (quando disponível)

9. Próximas implementações (quando for a hora)
----------------------------------------------
- Criar coluna `motivo` em `loja_estoque_movimentos` (enum/check).
- Criar endpoint: `POST /api/loja/estoque/ajuste-manual`.
- Criar modal/tela de ajuste manual no Admin.
- (Opcional) Registrar log em `auditoria_logs` para ajustes manuais.

