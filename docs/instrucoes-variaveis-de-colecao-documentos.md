# arquivo: docs/instrucoes-variaveis-de-colecao-documentos.md

# Instruções — Variáveis de Coleção (Documentos)
## Sistema Conexão Dança — Padrão definitivo para coleções em contratos e documentos

### Objetivo
Padronizar a criação e o uso de variáveis de coleção (listas/tabelas) no módulo Documentos, evitando erros recorrentes como:
- coleção detectada, mas não renderiza linhas
- dados existem em tela/SQL, mas contrato fica vazio
- tags de coleção abertas/fechadas sem corpo
- chaves/colunas incompatíveis (maiúsculas vs minúsculas)
- “recarregar” gera HTML, mas a UI não aplica o HTML retornado
- uso do campo errado (ex.: data de lançamento em vez de vencimento)

---

## Conceitos essenciais

### 1) Variável simples x Coleção
- Variável simples: substitui um valor único (ex.: `{{ALUNO_NOME}}`).
- Coleção: representa uma lista de itens, renderizada como tabela/linhas (ex.: parcelas, lançamentos, presenças).

Coleções sempre precisam de:
1) Código da coleção (ex.: `MATRICULA_PARCELAS`)
2) Definição de colunas (ex.: `DATA`, `DESCRICAO`, `VALOR`)
3) Resolver (código que busca e mapeia dados)
4) Template com bloco de iteração (loop)

---

## Padrões obrigatórios

### 2) Nome/código da coleção
Regras:
- Usar UPPER_SNAKE_CASE
- Prefixar pelo root (ex.: `MATRICULA_`, `ALUNO_`, `TURMA_`)
- Ser descritivo e estável

Exemplos:
- `MATRICULA_PARCELAS`
- `MATRICULA_LANCAMENTOS_CREDITO`
- `ALUNO_PRESENCAS`

---

### 3) Chaves (colunas) em MAIÚSCULO
Para evitar mismatch com template:
- As colunas/keys injetadas no contexto devem ser MAIÚSCULAS.
- O template deve usar MAIÚSCULAS.

Exemplo correto (item da coleção):
```json
{
  "DATA": "12/02/2026",
  "DESCRICAO": "Mensalidade 2026-02 - matrícula",
  "VALOR": "R$ 180,00"
}
```

Evitar:

`data`, `descricao`, `valor` (minúsculo) se o template estiver em maiúsculo.

---

## Template correto (evitar o erro clássico)

### 4) Regra de ouro: bloco de coleção precisa ter corpo
Erro que causa “tabela vazia” mesmo com dados:
```handlebars
{{#MATRICULA_PARCELAS}} {{/MATRICULA_PARCELAS}}
{{DATA}} {{DESCRICAO}} {{VALOR}}
```

Problema: o loop está vazio e os campos ficaram fora do bloco.

Correto:
```handlebars
{{#MATRICULA_PARCELAS}}
  {{DATA}} {{DESCRICAO}} {{VALOR}}
{{/MATRICULA_PARCELAS}}
```

Recomendação: usar `<table>` e `<tr>` para contratos em HTML:
```html
<table style="width:100%; border-collapse: collapse;">
  <thead>
    <tr>
      <th>Vencimento</th>
      <th>Descrição</th>
      <th>Valor</th>
    </tr>
  </thead>
  <tbody>
    {{#MATRICULA_PARCELAS}}
      <tr>
        <td>{{DATA}}</td>
        <td>{{DESCRICAO}}</td>
        <td>{{VALOR}}</td>
      </tr>
    {{/MATRICULA_PARCELAS}}
  </tbody>
</table>
```

---

## Fonte correta dos dados (semântica de contrato)

### 5) Contrato: vencimento e valor (não status interno)
Em contratos:
- usar vencimento da parcela (quando vence)
- usar valor
- não exibir status (status é operacional/financeiro, não contratual)

Regra prática:
- DATA no contrato = vencimento
- STATUS só se for um extrato, não contrato

---

## Fluxo obrigatório para criar uma nova coleção (passo a passo)

### 6) Checklist de criação (sem erro)
1) Definir objetivo da coleção
   - “Quero listar parcelas no contrato”
   - “Quero listar presenças do aluno”
   - “Quero listar lançamentos de crédito”
2) Confirmar a fonte real no banco (SQL)
   - descobrir a tabela/view e colunas necessárias
   - rodar SQL com filtro do root (ex.: `matricula_id = X`)
3) Criar/ajustar a definição da coleção no Admin
   - Código (UPPER_SNAKE_CASE)
   - Root (ex.: Matricula)
   - Colunas (UPPERCASE) e seus tipos (DATA/TEXTO/MONETARIO)
4) Implementar/ajustar o resolver
   - buscar dados pela chave do root (ex.: `matricula_id`)
   - mapear para objetos com keys UPPERCASE
   - formatar moeda em BRL (não usar centavos no template)
   - formatar data em dd/MM/yyyy
5) Atualizar o modelo/contrato
   - inserir bloco `{{#CODIGO_COLECAO}}` com corpo
   - garantir que as colunas do template batem com as keys
6) Validar com documento emitido
   - abrir `/admin/config/documentos/emitidos/:id`
   - clicar Recarregar
   - confirmar que o preview mostra as linhas

---

## Depuração padrão (quando “não aparece”)

### 7) Matriz de diagnóstico (rápida)
Se “tem dado na matrícula” mas “não aparece no contrato”, verificar:

A) Template
- O bloco `{{#COLECAO}}` tem corpo?
- `{{/COLECAO}}` não está na mesma linha da abertura?
- As keys do template são MAIÚSCULAS e existem no contexto?

B) Resolver
- Está buscando pela chave correta do root (ex.: `matricula_id`, não `emitido.id`)?
- Está usando o campo certo (ex.: vencimento em contrato)?
- Está formatando VALOR corretamente em BRL?

C) Render/Preview
- O Recarregar retorna HTML?
- O client aplica o html retornado pelo POST no preview?
- O preview usa `dangerouslySetInnerHTML` do HTML retornado?

---

## Ferramentas de debug (padrão do projeto)

### 8) Debug do “Recarregar”
Padrão adotado:
- O POST de recarregar pode retornar debug no JSON.
- O client pode exibir `<details>` Debug (recarregar) quando existir.
- Pode haver modo via querystring `?debug=1` (quando implementado).

Dados úteis no debug:
- `parcelasLen` (quantas linhas o resolver montou)
- `sanityDbLen` (quantas linhas existem no banco)
- `htmlLen` (tamanho do HTML gerado)
- `primeiraParcela` (para confirmar keys/valores)

---

## Padrões de formatação (contrato)

### 9) Datas e valores
- Data: `dd/MM/yyyy`
- Valor: `R$ 180,00` (BRL)
- Evitar exibir centavos crus (`18000`) no contrato

---

## Observações finais
- Coleções precisam sempre fechar o ciclo completo: SQL → resolver → template → render.
- O maior erro histórico foi template com loop vazio (abre/fecha sem corpo).
- Em contratos, a regra de ouro é: Vencimento + Valor.

---

## Histórico de aprendizado (resumo)
- Corrigimos schema mismatch em `documentos_emitidos` (campo real de vínculo era `contrato_modelo_id`).
- Resolvemos detecção de coleções e estabilizamos o recarregar.
- Confirmamos que a renderização dependia do template ter o loop com corpo.
- Ajustamos semântica: contrato deve usar vencimento, não `data_lancamento`, e não exibir status.
