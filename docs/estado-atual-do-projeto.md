## Modulo atual
Ballet Cafe com dashboard operacional na home do contexto e preferencia de pagina principal por contexto para cada usuario autenticado.

## SQL concluido
- Tabela `public.usuario_contexto_preferencias` para persistir a home por contexto e por usuario.
- Funcao `public.fn_cafe_classificar_consumidor` para classificar consumo do cafe por perfil.
- View `public.vw_cafe_vendas_analytics` para leitura analitica de vendas, horario, produto e perfil.
- View `public.vw_cafe_insumos_alertas` para leitura operacional de estoque e reposicao no schema atual do cafe.

## APIs concluidas
- `/api/me/contexto-home` para listar e salvar a pagina principal por contexto do usuario.
- `/api/me/contexto-home/resolver` para resolver a home efetiva do contexto com fallback institucional.
- `/api/cafe/dashboard` para expor metricas operacionais, financeiras e de consumo do Ballet Cafe.

## Paginas/componentes concluidos
- `/cafe` agora funciona como Dashboard do Ballet Cafe.
- `src/components/cafe/CafeDashboard.tsx` centraliza a UI do dashboard.
- `/administracao/configuracoes/contextos` permite configurar a home por contexto de forma individual.
- O seletor global de contexto passou a navegar para a rota principal configurada do usuario.
- `/cafe/admin` agora destaca explicitamente a separacao entre dashboard operacional e governanca do modulo.

## Pendencias
- Previsoes mais avancadas de reposicao com historico temporal.
- Alertas inteligentes de abastecimento baseados em consumo recorrente.
- Validacao visual final por prints das telas novas e do comportamento do seletor de contexto.

## Bloqueios
- Nenhum bloqueio funcional conhecido, salvo eventual divergencia futura de nomes reais das tabelas do cafe em outros ambientes.
- `npm run lint` pode continuar apontando erros legados fora do escopo desta entrega.

## Versao do sistema
Conectarte v0.9 com:
- dashboard operacional do Ballet Cafe;
- home por contexto configuravel por usuario;
- seletor global com navegacao orientada por preferencia;
- base pronta para expansao do modelo em outros modulos.

## Proximas acoes
- Validar `/cafe` com base real de vendas e insumos.
- Produzir prints finais de dashboard, configuracao de contexto e troca de contexto.
- Expandir o padrao de dashboard operacional para Loja quando a homologacao do Cafe fechar.
