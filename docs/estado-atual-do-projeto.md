## Modulo atual
Ballet Cafe com integracao financeira ampliada, dashboard operacional inteligente na home do contexto e pagina principal configuravel por usuario em cada contexto.

## SQL concluido
- Tabela `public.usuario_contexto_preferencias` para persistir a home por contexto e por usuario.
- Funcao `public.fn_cafe_classificar_consumidor` para classificar consumo do cafe por perfil.
- Views `public.vw_cafe_vendas_analytics` e `public.vw_cafe_insumos_alertas` para leitura operacional do Cafe.
- Migration `20260317_002_cafe_integracao_financeira_e_conta_interna.sql` para ampliar `cafe_vendas` com metadados financeiros, vinculos com cobranca/recebimento/movimento e configuracao do contexto Cafe nas formas de pagamento.

## APIs concluidas
- `/api/me/contexto-home` para listar e salvar a pagina principal por contexto do usuario.
- `/api/me/contexto-home/resolver` para resolver a home efetiva do contexto com fallback institucional.
- `/api/cafe/dashboard` para expor metricas operacionais, financeiras, estoque e consumo do Ballet Cafe.
- `/api/cafe/pagamentos/opcoes` para resolver meios de pagamento validos do Cafe conforme comprador, elegibilidade e centro de custo.
- `/api/cafe/caixa` e alias `/api/cafe/vendas` usando o mesmo nucleo financeiro do Cafe para PDV e Caixa administrativo.

## Paginas/componentes concluidos
- `/cafe` como dashboard operacional inteligente do Ballet Cafe.
- `/cafe/vendas` com meios de pagamento dinamicos por contexto e resumo do efeito financeiro esperado.
- `/cafe/caixa` com fluxo administrativo claro para retroativo, baixa parcial, Cartao Conexao e conta interna.
- `/administracao/configuracoes/contextos` para configurar a home individual por contexto.
- `src/components/cafe/CafeDashboard.tsx` consolidando KPIs, perfis, horario, financeiro, meios de pagamento e estoque.
- Seletor global de contexto navegando para a rota principal configurada do usuario.

## Pendencias
- Validacao visual final por prints no ambiente autenticado.
- Homologacao com vendas reais de aluno e colaborador para confirmar elegibilidade das opcoes de pagamento do Cafe.
- Evoluir previsoes de reposicao com historico temporal e alertas inteligentes.

## Bloqueios
- Nenhum bloqueio funcional conhecido no modulo do Cafe.
- O projeto ainda possui erros legados de lint e tipagem fora do escopo desta entrega em outros modulos e snapshots antigos.

## Versao do sistema
Conectarte v0.9 com:
- dashboard operacional do Ballet Cafe;
- home por contexto configuravel por usuario;
- PDV e Caixa apoiados pelo mesmo nucleo operacional;
- integracao financeira do Cafe com centro de custo, cobrancas, recebimentos, movimento financeiro, Cartao Conexao e conta interna.

## Proximas acoes
- Validar `/cafe`, `/cafe/vendas` e `/cafe/caixa` com dados reais no ambiente publicado.
- Produzir prints finais do dashboard, PDV, Caixa, opcoes de pagamento e configuracao de contexto.
- Refinar a leitura financeira do dashboard conforme o uso real do Ballet Cafe.
