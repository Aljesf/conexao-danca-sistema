# Revisao Manual -- FATURA_DUPLA e TRIPLA_OU_MAIS

## FATURA_DUPLA

- Pessoa: Alanna Costa Alves | pessoa_id: 85 | valor: 12000 | cobrancas_ids: [241, 376] | ids_com_fatura: [241, 376] | ids_sem_fatura: [] | observacao: duas cobrancas FATURA_CREDITO_CONEXAO no mesmo grupo.
- Pessoa: Barbara Lilian Miranda de Souza | pessoa_id: 46 | valor: 16500 | cobrancas_ids: [240, 377] | ids_com_fatura: [240, 377] | ids_sem_fatura: [] | observacao: possivel reprocessamento ou fechamento duplicado.
- Pessoa: Halanna Denise de Oliveira Demetrio | pessoa_id: 75 | valor: 30334 | cobrancas_ids: [242, 373] | ids_com_fatura: [242, 373] | ids_sem_fatura: [] | observacao: duas cobrancas de fatura com vinculo ativo no mesmo grupo.
- Pessoa: Maria de Nazare de Sousa Moura Monteiro | pessoa_id: 156 | valor: 11000 | cobrancas_ids: [234, 371] | ids_com_fatura: [234, 371] | ids_sem_fatura: [] | observacao: revisar qual cobranca representa o fechamento canonico.
- Pessoa: Maria Madalena de Vasconcelos | pessoa_id: 79 | valor: 16500 | cobrancas_ids: [243, 375] | ids_com_fatura: [243, 375] | ids_sem_fatura: [] | observacao: grupo com duas cobrancas FATURA_CREDITO_CONEXAO.
- Pessoa: Tedy de Figueiredo da Costa Pinheiro | pessoa_id: 87 | valor: 12000 | cobrancas_ids: [231, 370] | ids_com_fatura: [231, 370] | ids_sem_fatura: [] | observacao: suspeita de fechamento duplicado do mesmo valor.

## TRIPLA_OU_MAIS

- Pessoa: Carla Velasco Silvestre Lujan | pessoa_id: 59 | valor: 42000 | cobrancas_ids: [25, 245, 374] | ids_com_fatura: [245, 374] | ids_sem_fatura: [25] | observacao: grupo triplo com mistura de MATRICULA e FATURA_CREDITO_CONEXAO.

## Criterio futuro de decisao

- Revisar vinculo em `credito_conexao_faturas`.
- Revisar `created_at` das cobrancas.
- Revisar `origem_tipo` e `origem_id`.
- Decidir qual manter antes de qualquer cancelamento.
