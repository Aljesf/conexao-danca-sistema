# ADR-0008 - Matriculas referenciam Servico (e nao apenas Turma)

## Contexto
O sistema precisa reutilizar a mesma logica de matricula/financeiro para:
- cursos regulares (turmas anuais)
- cursos livres
- colonia de ferias
- inscricao em espetaculo / eventos

Turma e apenas um tipo de estrutura pedagogica, nao serve como "alvo" universal.

## Decisao
Introduzir a entidade "Servico" como alvo universal de uma matricula.

- Matricula passa a referenciar um `servico_id` (ou equivalente).
- Turma/Eventos/Cursos Livres geram automaticamente um Servico quando forem publicados/ativados.
- Turma continua existindo como vinculo pedagogico quando aplicavel, mas nao e o "alvo financeiro" universal.

## Motivacao
- Unificar precificacao e liquidacao (Conta Interna / Credito/Bolsa) num modelo unico.
- Permitir relatorios consistentes por tipo de servico.
- Evitar "matricula paralela" e duplicacao de regras.

## Consequencias
- Precificacao migra de `matricula_precos_turma` para `precos_servico` (ou tabela paralela).
- API operacional de matricula passa a validar preco por servico.
- UI do wizard escolhe Servico; se o servico exigir turma, escolhe turma em seguida.

## Plano
- Executar apos finalizar v1 (Conta Interna) nas APIs.
- Implementar antes da UI final (wizard) para evitar retrabalho de interface.
