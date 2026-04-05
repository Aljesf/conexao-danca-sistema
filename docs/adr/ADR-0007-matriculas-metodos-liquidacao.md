> ℹ️ DOCUMENTO EM ADEQUAÇÃO  
> Este documento será atualizado para refletir  
> as Regras Oficiais de Matrícula (Conexão Dança) – v1

# ADR-0007 - Matriculas: metodo de liquidacao (Conta Interna vs Credito/Bolsa)

## Contexto
O processo de Matricula (contrato/vinculo pedagogico) e independente do mecanismo financeiro de liquidacao.
O sistema possui:
- Conta Interna: conta + faturas + lancamentos, com fechamento e vencimento.
- Credito/Bolsa (Movimento Conexao Danca): saldo de creditos que pode quitar mensalidades/anuidades.

## Decisao
Manter uma unica tabela/processo de Matricula e introduzir um "metodo de liquidacao" para o eixo financeiro.

A matricula sempre cria:
- registro em `matriculas`
- vinculo pedagogico em `turma_aluno` (ou via `vinculo_id`, conforme schema atual)

O que muda e o eixo financeiro:
1) `CARTAO_CONEXAO_FATURA`
   - cria/garante Conta Interna
   - cria/garante faturas por competencia
   - cria lancamentos de fatura (parcelas + pro-rata)
   - cobranca final ocorre no fechamento da fatura

2) `CREDITO_BOLSA`
   - valida saldo e regras do credito/bolsa
   - debita creditos (ou reserva, se aplicavel)
   - registra rastreabilidade da quitacao por credito
   - nao gera fatura/cobranca

## Motivacao
- Evitar duplicacao ("matricula paralela") e inconsistencia de relatorios.
- Garantir rastreabilidade: tudo continua referenciando `matriculas.id`.
- Permitir expansao (ex.: "manual", "patrocinio", "cortesia") sem mudar o dominio pedagogico.

## Consequencias
- APIs operacionais devem aceitar `metodo_liquidacao`.
- A API de detalhe operacional deve retornar informacoes financeiras conforme metodo.
- A Conta Interna passa a ser a origem central de vencimento/encargos para matricula quando metodo for fatura.

## Proximos passos
- Definir enum/coluna em `matriculas` para metodo de liquidacao.
- Criar estruturas de "fatura" e "lancamentos" (ou reutilizar as existentes na Conta Interna).
- Integrar carteira de creditos/bolsas no fluxo transacional da matricula.
