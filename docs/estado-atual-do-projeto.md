## 1. Módulo atual
Ballet Café - reorganização de produtos e classificação comercial

## 2. SQL concluído
- Migration de dados criada para reorganizar os 31 produtos atuais do Ballet Café.
- Padronização das categorias canônicas: `BEBIDAS`, `SALGADOS`, `DOCES` e `OUTROS`.
- Padronização das subcategorias canônicas do catálogo.
- Correção relacional de `categoria_id` e `subcategoria_id` em `cafe_produtos`.
- Padronização de nomenclatura dos produtos sem alterar preços atuais.
- Ajuste do campo `preparado` conforme o comportamento real de cada item.
- Compatibilidade temporária preservada no campo textual legado `categoria`.
- Nenhuma alteração de schema nesta etapa, apenas reorganização de dados.

## 3. APIs concluídas
- Nenhuma alteração de API nesta etapa.
- A tela de produtos continuou usando as rotas já existentes do módulo Café.
- A carga atual já atende categoria e subcategoria relacionais sem criação de endpoint novo.

## 4. Páginas/componentes concluídos
- Tela `/cafe/admin/produtos` ajustada para ler e priorizar categoria e subcategoria relacionais.
- Ordenação visual da listagem por categoria, subcategoria e nome.
- Inclusão de busca simples por nome, categoria ou subcategoria na listagem.
- Correção de microtextos, cabeçalhos e problemas de encoding na página de produtos.
- Melhoria da leitura da tabela com colunas:
  - Nome
  - Categoria
  - Subcategoria
  - Preço fallback
  - Preparado
- Cards superiores atualizados para refletir:
  - total de produtos
  - categorias em uso
  - preparados x simples

## 5. Pendências
- Reorganizar também o domínio de insumos do Ballet Café com a mesma disciplina relacional.
- Evoluir o PDV do Café para um fluxo operacional mais rápido e mais enxuto.
- Revisar a gestão de categorias/subcategorias para adicionar manutenção administrativa mais completa dentro do contexto do Café.
- Validar visualmente em produção a navegação e a leitura da tabela de produtos após deploy.

## 6. Bloqueios
- Nenhum bloqueio funcional do escopo Café.
- O `lint` do repositório ainda possui falhas legadas fora do escopo deste módulo.

## 7. Versão do sistema
Conectarte v0.9 - Ballet Café com catálogo de produtos reorganizado

## 8. Próximas ações
- Reorganizar insumos do Café com o mesmo padrão de categorias e consistência operacional.
- Depois disso, evoluir o PDV dedicado do Café com foco em velocidade de operação.
