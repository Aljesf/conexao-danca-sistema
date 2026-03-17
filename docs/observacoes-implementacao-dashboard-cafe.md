## Dashboard do Cafe
- O dashboard do Ballet Cafe prioriza leitura operacional e nao apenas faturamento bruto.
- A tela precisa destacar ticket medio, horario de pico, top produtos, padrao de consumo por aluno, padrao de consumo por colaborador e alertas de estoque.
- A base analitica usa `data_operacao` para o dia de referencia e `created_at` convertido para `America/Fortaleza` para a faixa horaria no schema atual.

## Pagina principal por contexto
- A preferencia de home e individual por usuario autenticado.
- A configuracao fica vinculada ao contexto, nao ao dispositivo.
- Ao trocar o contexto no seletor superior, a UI consulta a rota principal configurada para aquele contexto.
- Se nao houver configuracao do usuario ou se a API falhar, o sistema aplica o fallback institucional do contexto.

## Rastreio temporal e consumo
- A view analitica do cafe usa `data_operacao` para preservar retroatividade por dia e `created_at` local como proxy de horario enquanto nao existir timestamp real da venda.
- Se o modulo ganhar um campo temporal mais preciso que `created_at`, a view deve ser ajustada para priorizar esse novo campo para a leitura de horario.
- O objetivo do dashboard e explicar comportamento de venda, mix e operacao, nao somente apresentar listas cruas.
