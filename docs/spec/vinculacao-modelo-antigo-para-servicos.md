> ℹ️ DOCUMENTO EM ADEQUAÇÃO  
> Este documento será atualizado para refletir  
> as Regras Oficiais de Matrícula (Conexão Dança) – v1

# 📘 Vinculação — Modelo Antigo (tipo_matricula/vinculo_id) → Modelo Novo (servico_id)

Gerado em: 2025-12-24T12:38:08-03:00

## Objetivo
Consolidar e conectar o material antigo (docs) de matrícula/curso livre/projeto artístico com a implementação atual:
- `public.servicos` (alvo universal)
- `public.matricula_precos_servico`
- `public.matriculas.servico_id` + `vinculo_id` opcional
- `metodo_liquidacao` (Cartão Conexão como padrão)

## Fontes encontradas (principais)
- docs/api-matriculas.md
- docs/modelo-matriculas.md
- docs/modelo-turmas.md
- docs/modelo-contratos-academicos-e-artistico.md
- docs/adr/ADR-0008-matriculas-referenciam-servico.md
- src/types/turmas.ts (TipoTurma REGULAR/CURSO_LIVRE/ENSAIO)
- src/app/(private)/matriculas/novo/page.tsx (fluxo legado)
- src/app/(private)/escola/matriculas/* (novo fluxo escola)

## Vocabulário (contratual x operacional)
### Contratual (jurídico / contratos)
- `tipo_matricula`: REGULAR | CURSO_LIVRE | PROJETO_ARTISTICO

### Operacional (serviços)
- `servicos.tipo`: TURMA | CURSO_LIVRE | WORKSHOP | ESPETACULO | EVENTO

## Tabela de equivalência recomendada
| servicos.tipo | contexto | tipo_matricula (contratual) |
|---|---|---|
| TURMA (turmas.REGULAR) | curso anual regular | REGULAR |
| TURMA (turmas.CURSO_LIVRE) | turma de curso livre/colônia | CURSO_LIVRE |
| CURSO_LIVRE | curso pontual sem turma rígida | CURSO_LIVRE |
| WORKSHOP | oficina intensiva | CURSO_LIVRE |
| ESPETACULO | inscrição artística | PROJETO_ARTISTICO |
| EVENTO | festival/mostra/apresentação | PROJETO_ARTISTICO |

## Regras de vínculo pedagógico
- Se `servicos.tipo = TURMA`:
  - `vinculo_id` deve existir (turmas.turma_id)
  - cria `turma_aluno`
- Se `servicos.tipo != TURMA`:
  - `vinculo_id` pode ser NULL
  - não cria `turma_aluno`
  - (futuro) pode criar vínculo específico do módulo (evento_participantes, etc.)

## Liquidação financeira (padrão)
- `metodo_liquidacao` default: CARTAO_CONEXAO
- matrícula cria lançamentos `credito_conexao_lancamentos` com `origem_sistema='MATRICULA'` e `status='PENDENTE_FATURA'`
- faturas e cobrança final seguem o fluxo do Cartão Conexão (já existente)

## Status dos fluxos de UI
- Novo: src/app/(private)/escola/matriculas/* (processo operacional)
- Legado: src/app/(private)/matriculas/novo/page.tsx (modelo antigo)
  - manter por ora, mas planejar depreciação/redirect quando o wizard novo estiver completo

## Próximas ações recomendadas
1) Atualizar docs/api-matriculas.md para refletir:
   - servico_id
   - vinculo_id opcional
   - metodo_liquidacao
2) Decidir se `tipo_matricula` será:
   - mantido como contratual (recomendado)
   - ou derivado automaticamente de `servicos.tipo` (possível)
3) Criar “Serviço TURMA” automaticamente no cadastro de Turmas (opcional; depois)
