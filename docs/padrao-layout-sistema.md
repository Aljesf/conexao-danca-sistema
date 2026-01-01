# Padrao de Layout e UI - Sistema Conexao Danca

Documento oficial. Fonte unica de verdade visual do sistema. Baseado somente nas paginas reais listadas na especificacao.

## 1. Objetivo do padrao de layout
Definir o layout base, hierarquia visual e organizacao de conteudo das paginas do sistema para manter consistencia visual e operacao previsivel.

## 2. Principios fundamentais do sistema
- Priorizar legibilidade: titulos claros, textos explicativos e blocos bem delimitados.
- Segmentar conteudo em cards com borda e sombra leve.
- Formularios e tabelas sempre dentro de um card.
- Feedback de erro/sucesso visivel e localizado no card relevante.
- Layout responsivo com container central e grid para colunas.

## 3. Regra explicita: layout != sidebar
- O layout de pagina e o conteudo visual interno nao sao a sidebar.
- Sidebar e navegacao global nao fazem parte deste padrao.
- Alterar layout de pagina nao altera sidebar e vice-versa.

## 4. Estrutura base obrigatoria de qualquer pagina
1) Container externo:
   - Pagina com altura minima e padding lateral/vertical.
   - Fundo com gradiente suave (ex: from-slate-50 to-white; algumas paginas usam from-pink-50).
2) Container interno:
   - max-w-6xl (ou max-w-6xl equivalente) centralizado.
   - Layout em coluna com gap vertical consistente.
3) Cards principais:
   - Card de contexto no topo.
   - Cards funcionais em seguida (formularios, listas, dashboards).

## 5. Header de contexto (imutavel)
Caracteristicas observadas:
- Card com borda, fundo branco, padding generoso, sombra leve.
- Titulo principal (h1) com font-semibold.
- Subtitulo explicativo em texto menor.
Funcao: dar o contexto global da pagina.

## 6. Card de titulo da pagina (obrigatorio)
Padrao observado:
- H1 com titulo da pagina dentro do primeiro card.
- Texto explicativo logo abaixo.
Sempre presente, mesmo em paginas com formulario unico.

## 7. Card "Entenda esta tela" (quando usar)
Uso observado:
- FinanceHelpCard em paginas financeiras para explicar operacao real.
Regras:
- Usar quando o fluxo tem regras de negocio e impacto financeiro.
- Deve aparecer logo apos o card de contexto.
- Lista curta de itens com orientacao pratica.

## 8. Cards funcionais (formularios, listas, dashboards)
Padrao:
- Cada bloco funcional em um card independente.
- Cards podem conter titulo (h2/h3), descricao e conteudo.
Exemplos observados:
- Dashboard financeiro: cards por bloco (saude, leitura GPT, fluxo, centros).
- Centros de custo: card de formulario + card de listagem.
- Contas a pagar: card de filtros + card de tabela + modal de pagamento.
- Cursos: FormCard para cadastro/edicao e para lista.

## 9. Padrao de formularios
Caracteristicas comuns:
- Campos com label acima do input.
- Inputs com borda e padding uniforme.
- Grid responsivo (md:grid-cols-2 ou sm:grid-cols-2).
- Campos longos ocupam colunas completas.
- Checkbox com label inline.
- Acoes no rodape do card: botao primario + opcional botao secundario.
- Texto auxiliar quando necessario.

## 10. Padrao de tabelas e listagens
Tabelas:
- Dentro de card, com overflow-x-auto quando necessario.
- Thead com texto pequeno e uppercase.
- Linhas com hover leve.
- Colunas numericas alinhadas a direita.
Listas em cards:
- Grid de cards com borda e sombra leve.
- Cada item tem titulo, detalhes e acoes (editar/ativar etc.).

## 11. Padrao de dashboards
Observado no dashboard financeiro:
- Card de contexto com links de navegacao.
- Blocos numerados mentalmente (saude, leitura, fluxo, centros, drill-down).
- Cards pequenos para KPI dentro de um bloco.
- Grafico em container com legenda e descricao.
- Call to action (botoes Atualizar/Reanalisar).

## 12. O que e permitido variar
- Conteudo interno de cards (campos, colunas, texto).
- Quantidade de cards funcionais conforme a necessidade.
- Uso de cores de destaque em botoes (roxo no financeiro, violeta no cadastro de pessoas).
- Uso de modais para acao critica (ex: registrar pagamento).
- Presenca de links rapidos dentro do card de contexto.

## 13. O que e proibido variar
- Remover o card de contexto com titulo/subtitulo.
- Colocar formulario ou tabela fora de card.
- Misturar sidebar com layout de pagina.
- Criar layout sem container central.
- Remover feedback de erro/sucesso de fluxos de formulario.

## 14. Regras obrigatorias para criacao de novas paginas
- Usar estrutura base: container externo + container interno + card de contexto.
- Definir titulo e subtitulo no card de contexto.
- Dividir operacoes em cards funcionais.
- Se houver formulario, seguir grid e label padrao.
- Se houver tabela, usar thead em uppercase e colunas alinhadas.
- Nao acoplar navegacao global ao layout da pagina.

## 15. Regras obrigatorias para refatoracao de paginas existentes
- Preservar a hierarquia: contexto -> card funcional -> tabela/form.
- Manter textos explicativos institucionais quando existem.
- Nao mover sidebar ou criar nova navegacao global.
- Nao remover cards de ajuda financeira quando existem.
- Garantir que a pagina continue responsiva (grid e max-w).
