# 📘 Camada de Contexto do Sistema — Conexão Dança

## Objetivo

Esta pasta existe para servir como camada de leitura rápida e estratégica do sistema para:

- Codex
- GPT
- novos chats
- futura leitura por integrações externas
- novos desenvolvedores

Ela não substitui os documentos canônicos já existentes em `docs/`.
Ela resume:

- como o sistema está hoje
- quais nomes técnicos/legados ainda existem
- quais nomes institucionais/de negócio devem orientar alterações futuras

## Regras desta pasta

- Esta pasta é uma camada de contexto, não a fonte normativa principal.
- Sempre preservar duas leituras:
  - estado atual real
  - direção futura / nomenclatura-alvo
- Não apagar a história documental do sistema.
- Toda futura refatoração deve consultar esta pasta antes de:
  - renomear entidades
  - alterar textos de UI
  - alterar contratos
  - alterar financeiro
  - alterar matrícula
  - alterar documentos institucionais

## Estrutura inicial

- `00-visao-geral.md`
- `01-nomenclatura-oficial.md`
- `02-mapa-documental.md`
- `03-leitura-rapida-do-sistema.md`

## Arquivos futuros recomendados

- `04-financeiro.md`
- `05-matriculas.md`
- `06-turmas.md`
- `07-loja-cafe.md`
- `08-documentos.md`

## Regra de ouro

Esta camada existe para evitar que o agente:

- trate o legado como se fosse regra final
- trate a regra nova como se já estivesse 100% implantada no código
- misture nomenclatura técnica antiga com nomenclatura institucional nova sem critério

## Atualização obrigatória

- a pasta `_contexto` deve ser atualizada sempre que houver mudança relevante de arquitetura, nomenclatura, domínio ou leitura operacional do sistema
- a documentação não é opcional no fechamento de etapa
- mudanças relevantes precisam refletir também em `docs/estado-atual-do-projeto.md`
