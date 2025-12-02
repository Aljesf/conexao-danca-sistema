# Ficha de Cuidados do Aluno — Conexão Dança
**Versão:** 1.0  
**Data:** 28/11/2025  
**Responsável:** Alírio de Jesus e Silva Filho (com equipe pedagógica)

## Objetivo
Registrar, no momento da matrícula, informações importantes sobre
saúde, segurança, alimentação e vestuário do aluno, para:

- orientar professores e equipe administrativa;
- reduzir riscos (ex.: alergias, saídas indevidas);
- demonstrar cuidado com a criança/adolescente.

Essas informações devem ser:

- coletadas na matrícula (com os responsáveis);
- facilmente visíveis na ficha do aluno e nas telas de turma;
- revisáveis/atualizáveis quando necessário.

---

## 1. Seção: Saúde geral e histórico físico

Perguntas/atributos sugeridos:

- **Histórico de lesões ou cirurgias relevantes**
  - Campo: `historico_lesoes`
  - Pergunta guia:  
    > “O aluno já teve alguma fratura, lesão, cirurgia ou limitação física importante? Quais?”
- **Limitações de movimento / restrições físicas**
  - Campo: `restricoes_fisicas`
  - Ex.: “Não pode fazer impacto alto”, “Evitar saltos”, etc.
- **Informações neurodivergentes / comportamentais**
  - Campo: `condicoes_neuro`
  - Pergunta com linguagem cuidadosa:
    > “O aluno possui algum diagnóstico ou condição que devamos considerar em aula (ex.: TDAH, TEA, dislexia, ansiedade, etc.)? Gostaria de registrar algo?”
  - OBS: texto livre, sem obrigatoriedade.
- **Tipo sanguíneo (opcional)**
  - Campo: `tipo_sanguineo`
  - Opções: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`, `Não sei`
- **Contato de emergência**
  - Campos: `nome_emergencia`, `telefone_emergencia`, `relacao_emergencia`

---

## 2. Seção: Alergias e restrições

### 2.1 Alergias a alimentos
- Campo: `alergias_alimentares`
- Pergunta: “O aluno possui alguma alergia alimentar? Quais?”

### 2.2 Alergias a medicamentos
- Campo: `alergias_medicamentos`
- Pergunta: “O aluno possui alergia a algum medicamento? Quais?”

### 2.3 Alergias a produtos / contato
- Campo: `alergias_produtos`
- Ex.: “Alergia a tecido sintético, látex, perfume forte, etc.”

---

## 3. Seção: Alimentação em eventos e aula

Aqui entram as situações de bolo, refrigerante, festinhas etc.

- Campo: `pode_consumir_acucar`  
  Opções sugeridas:
  - `PODE` – pode consumir normalmente;
  - `EVITAR` – só em ocasiões especiais, avisar responsável;
  - `NAO_PODE` – não deve consumir.
- Campo: `pode_consumir_refrigerante`  
  Mesmas opções: `PODE`, `EVITAR`, `NAO_PODE`.
- Campo: `restricoes_alimentares_observacoes`
  - Texto livre para observações dos pais.

---

## 4. Seção: Autorização de saída da escola

### 4.1 Tipo de autorização principal

Campo: `tipo_autorizacao_saida` (enum sugerido):

- `APENAS_RESPONSAVEL_LEGAL`
  - Só sai com pai/mãe ou responsável cadastrado como tal.
- `APENAS_PESSOAS_AUTORIZADAS`
  - Só sai com pessoas incluídas numa lista específica.
- `QUALQUER_PESSOA_AUTORIZADA_POR_SENHA`
  - Pode sair com mototáxi, vizinho, parente, etc., desde que informe a senha/palavra.
- `PODE_SAIR_SOZINHO`
  - Para adolescentes mais velhos, se os responsáveis autorizarem.

### 4.2 Pessoas autorizadas a buscar o aluno

Tabela `aluno_autorizados_busca` (conceito):

- `nome`
- `parentesco`
- `documento` (opcional)
- `telefone`
- `observacoes`

Pergunta na matrícula:

> “Quem está autorizado a buscar o aluno na escola (além dos responsáveis legais)?”

---

## 5. Seção: Medidas e tamanhos (para uniforme e calçados)

Objetivo: ajudar planejamento de estoque (sapatilhas, collant, meia, etc.).

Modelo de dados pode ser flexível:

### 5.1 Abordagem 1 — Campos fixos

Campos como:

- `calcado_numero`
- `sapatilha_meia_ponta`
- `sapatilha_ponta`
- `sapato_jazz`
- `tamanho_collant`
- `tamanho_meia_calca`
- `tamanho_saia`
- `tamanho_camisa`
- `tamanho_calca_ou_short`

### 5.2 Abordagem 2 — Tabela genérica por tipo

Tabela `aluno_medidas`:

- `tipo` (ex.: "calcado", "sapatilha_meia_ponta", "collant", etc.)
- `valor` (ex.: "25", "P", "10 anos")
- `observacao`

Isso permite adicionar novos itens no futuro sem mexer em coluna.

Perguntas na matrícula (podem ser agrupadas visualmente):

> “Qual o número do calçado do aluno?”  
> “Quais os tamanhos de collant, meia-calça e saia?”  
> “Qual tamanho para roupas (P/M/G/10 anos, etc.)?”

---

## 6. Seção: Observações pedagógicas

Campo: `observacoes_pedagogicas`

Pergunta aberta:

> “Há algo mais que você gostaria que os professores soubessem sobre o aluno (comportamento, rotina, preferências, medos, etc.)?”

---

## 7. Visualização no sistema

### 7.1 Na matrícula

- **Passo 4** do fluxo de matrícula:  
  “Cuidados e informações especiais”
- Tudo isso aparece como **formulário** com seções dobráveis:
  - Saúde / histórico  
  - Alergias  
  - Alimentação e saídas  
  - Medidas  
  - Observações pedagógicas  

### 7.2 Na ficha do aluno

- Um painel fixo “**Cuidados do aluno**”, sempre visível na lateral da ficha.
- Botão de editar separado da ficha civil.

### 7.3 Na tela de turma

- Na lista de alunos da turma:
  - Ícone/badge quando houver cuidados relevantes:
    - ex.: `⚠️ Cuidados`, ou ícones resumidos.
- Ao clicar no aluno:
  - abre um painel mostrando um resumo:
    - alergias principais;
    - restrições de alimentação;
    - tipo de saída/autorização;
    - contatos de emergência.

---
