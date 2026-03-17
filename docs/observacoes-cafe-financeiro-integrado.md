# Observacoes — Cafe Financeiro Integrado

## 1. Comprador identificado vs nao identificado

- Comprador nao identificado so pode usar meios imediatos do contexto Cafe.
- Pessoa avulsa identificada continua no fluxo imediato ou parcial, sem conta interna institucional.
- Aluno identificado pode consumir no ato ou seguir para Cartao Conexao Aluno quando houver elegibilidade.
- Colaborador identificado pode consumir no ato, via Cartao Conexao do colaborador ou via conta interna para fechamento futuro.

## 2. Pagamento imediato, Cartao Conexao e conta interna

- Pagamento imediato gera recebimento e movimento financeiro do Ballet Cafe.
- Cartao Conexao nao gera recebimento imediato; gera cobranca canonica por competencia e lancamento por `cobranca_id`.
- Conta interna do colaborador tambem nao gera recebimento imediato; o consumo fica reservado para fechamento futuro em fatura/folha.
- Fluxos futuros exigem comprador elegivel e competencia valida.

## 3. Centro de custo do Cafe

- Toda venda do Cafe precisa permanecer vinculada ao centro de custo Ballet Cafe.
- O recebimento imediato do Cafe reflete no financeiro geral com o centro de custo do proprio Cafe.
- Consumos em Cartao Conexao ou conta interna continuam economicamente atribuidos ao Ballet Cafe, mesmo com liquidacao posterior.

## 4. Diferenca entre PDV e Caixa administrativo

- `PDV / Vendas` e o fluxo rapido de balcao.
- `Caixa / Lancamentos` e a tela administrativa para retroativo, revisao, baixa parcial e correcao de saldo.
- Os dois fluxos usam o mesmo nucleo operacional e o mesmo tratamento financeiro do Cafe.

## 5. Regra institucional

- O Cafe nao mantem financeiro paralelo.
- O modulo reaproveita cobrancas, recebimentos, movimento financeiro, credito conexao e faturas do projeto.
- As opcoes de pagamento do Cafe precisam vir do cadastro por contexto/centro de custo, e nao de uma lista fixa no front.
