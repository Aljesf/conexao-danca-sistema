# 📘 IA — Economia de Tokens & Estratégia de Consumo  
Sistema Conexão Dança — Documento Oficial  
Versão: 1.0  
Data: 02/12/2025  
Responsável: Alírio de Jesus e Silva Filho  
Assistente Técnico: GPT (OpenAI)

---

# 🔷 1. Objetivo do Documento

Definir **todas as estratégias permanentes de economia e otimização de tokens** para uso da OpenAI API dentro do Sistema Conexão Dança, garantindo:

- baixo custo mensal;  
- alta eficiência das respostas;  
- controle total de consumo;  
- escalabilidade da IA;  
- integração limpa com backend e Codex.

Este documento complementa:

- 📘 arquitetura-ia.md  
- 📘 ia-integracao-passos.md  

E funciona como **regra oficial interna** para todo uso de GPT no sistema.

---

# 🔷 2. Premissas Gerais de Economia

1. **Modelo mínimo necessário sempre.**  
2. **Jamais enviar informações repetidas em cada requisição.**  
3. **Sistema prepara e filtra dados antes de enviar para o GPT.**  
4. **Contexto extremamente curto.**  
5. **Dividir tarefas grandes em partes menores para não estourar tokens.**  
6. **Uso extensivo de “memory local” via banco de dados ou arquivos internos.**

---

# 🔷 3. Estratégia Oficial de Modelos

## 3.1 Níveis de modelos disponíveis

### **MODELO ECONÔMICO (default)**
- `gpt-4.1-mini` ou `gpt-4o-mini`  
- custo ultra baixo  
- excelente para:
  - perguntas administrativas  
  - interpretação de dados  
  - geração de pequenos trechos de código  
  - explicações internas  
  - análises rápidas  
  - validações

95% das chamadas do sistema usarão este modelo.

---

### **MODELO PADRÃO (intermediário)**
- `gpt-4.1` ou similar  
- usado apenas quando:
  - documentação longa  
  - geração de páginas complexas  
  - análise de schema maior  
  - integração entre vários módulos  
  - múltiplas tabelas e regras simultâneas

---

### **MODELO PROFUNDO (excepcional)**
- Modelos de custo mais alto  
- Usado SOMENTE quando:
  - reescrever módulos inteiros  
  - analisar todo o projeto  
  - criar fluxos complexos (ex: matrícula completa)  
  - gerar arquiteturas avançadas  

O painel Admin deve exigir **opção explícita** do administrador para usar esse modo.

---

## 3.2 Seleção automática do modelo (lógica oficial)

O backend implementará:

mode: "economico" | "padrao" | "profundo"

rust
Copiar código

Se nada for informado:

mode = "economico"

yaml
Copiar código

Apenas o Administrador poderá elevar o modo.

---

# 🔷 4. Princípios de Prompt Econômico

O sistema deverá sempre:

### ✔ 4.1 Mandar o mínimo possível  
Sem SQL bruto  
Sem documentos gigantes  
Sem histórico extenso  
Sem texto redundante  

### ✔ 4.2 Fornecer apenas o recorte necessário  
Antes de consultar o GPT, o backend deve:

- consultar tabelas relevantes  
- gerar um JSON minificado  
- filtrar colunas irrelevantes  
- remover campos nulos  
- recortar listas muito longas

### ✔ 4.3 Manter prompts curtos  
O system prompt deverá ser sempre extremamente objetivo:

Você é o assistente administrativo técnico do Sistema Conexão Dança.
Responda de forma objetiva, técnica e econômica.

yaml
Copiar código

---

# 🔷 5. Histórico Curto (Regra de Ouro)

O painel de IA deverá manter **apenas as últimas 3 a 7 mensagens**.

Nunca carregar conversas longas.

Isso evita:

- duplicação de contexto  
- explosão de tokens  
- respostas lentas  
- custo desnecessário  

---

# 🔷 6. Armazenamento de Contexto no Sistema (não no GPT)

O sistema deve armazenar localmente:

- visões gerais internas  
- modelos de dados  
- schemas resumidos  
- contratos oficiais  
- documentos administrativos  
- regras de matrícula/turmas/financeiro

O GPT só receberá:

- recortes  
- trechos  
- partes relevantes  

Essa regra reduz drasticamente o consumo mensal.

---

# 🔷 7. Compressão e Resumo de Dados

Antes de enviar dados grandes:

### ✔ Backend deve resumir  
Exemplo:

**ANTES (custoso):**

{
"turmas": [ ... 1200 campos ... ],
"professores": [ ... ]
}

markdown
Copiar código

**DEPOIS (ideal):**

{
"turma": { "id": 88, "nome": "Ballet Iniciante", "status": "ATIVA" },
"professores": ["Maria", "Joana"]
}

yaml
Copiar código

### ✔ Apenas o essencial  
A IA não precisa dos dados completos para pensar.

---

# 🔷 8. Reutilização de Contexto Estático

Documentos como:

- Visão Geral do Sistema  
- Modelo de Matrículas  
- Modelo Financeiro  
- Sidebar Oficial  

já existem no repositório.

Regras:

1. Backend deve carregar o documento.  
2. Extrair apenas a parte relevante.  
3. Enviar esse trecho ao GPT.  

Exemplo:  
Se a pergunta é sobre **Turmas**, enviar apenas:

- trecho da Visão Geral sobre Turmas  
- trecho do Modelo de Turmas  
- estrutura JSON do schema da tabela `turmas`

E nada mais.

---

# 🔷 9. Requisições Cacheadas (opcional futuro)

A OpenAI permite **Cached Inputs**, com custo 10x menor na entrada.

Quando implementado no backend:

- documentos internos ficam cacheados  
- prompts muito repetidos se tornam quase gratuitos

---

# 🔷 10. Limite de Tokens por Requisição

Configuração padrão sugerida:

max_prompt_tokens: 2000
max_completion_tokens: 1500

yaml
Copiar código

Somente modo profundo pode ultrapassar isso.

Evitar prompts maiores que 8.000 tokens, pois:

- ficam caros  
- demoram  
- podem estourar limite do modelo  

---

# 🔷 11. Fragmentar Tarefas Grandes

Toda tarefa complexa deve ser dividida em partes pequenas:

### ✔ Parte 1: análise do problema  
### ✔ Parte 2: gerar API  
### ✔ Parte 3: gerar telas  
### ✔ Parte 4: gerar testes  
### ✔ Parte 5: validação

Isso economiza tokens e facilita rastreabilidade.

---

# 🔷 12. Otimização via Codex (gratuito internamente)

Sempre que possível:

- gerar código no Codex em vez da API  
- o Codex não consome tokens suas chamadas internas  
- toda parte pesada de geração de código pode ocorrer localmente

A IA entra apenas para *pensar*, não para *gerar 30 telas* via API.

---

# 🔷 13. Regras Específicas para o Administrador

O painel `/admin/ia` deverá alertar:

### ⚠️ Ao usar `mode: profundo`
“Esta operação pode consumir mais tokens.  
Deseja continuar?”

### ⚠️ Ao enviar documento grande
“Recomendável enviar apenas um recorte.”

---

# 🔷 14. Estimativa de Custos (base otimizada)

Com estas regras:

- 20–60 perguntas diárias → **R$ 5 a R$ 20/mês**
- Consultas por schema resumido → **centavos**
- Uso profundo ocasional → **R$ 1–3 por execução**

Custo anual estimado:
**R$ 60 a R$ 240**  
(muito abaixo de qualquer serviço contratado de TI)

---

# 🔷 15. Checklist Permanente de Economia

| Item | Deve ser seguido? | Motivo |
|------|------------------|--------|
| Usar `gpt-4.1-mini` como padrão | ✔ | 90% mais barato |
| Mandar apenas trechos | ✔ | evita explosão de tokens |
| Histórico curto | ✔ | metade do custo é histórico |
| Resumo antes de enviar | ✔ | backend preparado para isso |
| Usar Codex para geração de código | ✔ | zero custo |
| Modelo profundo apenas sob demanda | ✔ | custo controlado |
| Documentos internos salvos localmente | ✔ | evita repetir texto |
| Controle de tokens no backend | ✔ | limites de segurança |

---

# 🔷 16. Conclusão Oficial

Este documento estabelece a **política permanente de uso econômico de IA** no Sistema Conexão Dança.

Seguindo estas regras:

- o sistema terá custo **extremamente baixo**;  
- o GPT trabalhará **com máxima eficiência**;  
- haverá **controle total de consumo**;  
- o sistema poderá crescer para dezenas de módulos complexos  
  sem qualquer risco financeiro.

Esta é uma peça fundamental da transformação tecnológica do sistema.

---

# ✔ Fim do documento — `ia-economia-tokens.md`