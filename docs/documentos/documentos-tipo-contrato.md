# 📘 Documentos — Tipo: Contrato
Sistema Conexão Dança

> **Documento filho do domínio DOCUMENTOS.**  
> Este arquivo trata exclusivamente das particularidades do **tipo de documento CONTRATO**.  
>  
> Documento pai obrigatório:  
> 📄 `docs/documentos/documentos-visao-geral.md`

---

## 1. Natureza do Contrato

No Sistema Conexão Dança, **Contrato** é um tipo de documento formal que:

- estabelece vínculo jurídico entre as partes;
- formaliza direitos e deveres institucionais;
- referencia regras normativas externas ao próprio contrato;
- **não define valores nem lógica financeira operacional**.

O contrato **não é a fonte de verdade financeira**.  
Ele é um **instrumento jurídico declarativo**.

---

## 2. Relação do Contrato com a Operação

Todo contrato está sempre vinculado a uma **Operação**, conforme definido no domínio Documentos.

Exemplos:
- MATRÍCULA_REGULAR
- MATRÍCULA_BOLSA
- PRESTACAO_SERVICO
- PROJETO_ARTISTICO

A operação define:
- quando o contrato é exigido;
- qual conjunto de documentos se aplica;
- o contexto de dados utilizado no preenchimento.

---

## 3. Relação do Contrato com a Matrícula

No contexto educacional, o contrato:

- **não cria** a matrícula;
- **não executa** cobrança;
- **não define** vencimento, parcelamento ou pró-rata.

Ele apenas:
- formaliza o vínculo educacional/artístico;
- referencia os documentos normativos vigentes;
- registra a concordância das partes.

A matrícula é o **ato operacional**.
O contrato é o **instrumento jurídico** que a acompanha.

---

## 4. Hierarquia Normativa (regra obrigatória)

Em caso de divergência, a hierarquia documental é:

1. **Regras Oficiais de Matrícula (Conexão Dança)**  
2. **Tabela de Preços — Cursos (Escola)**  
3. **Políticas institucionais vigentes**  
4. **Contrato**

O contrato **não cria regras próprias** que contrariem documentos normativos superiores.

---

## 5. Tipos de Contrato Utilizados

O sistema pode possuir múltiplos **modelos de contrato**, todos do tipo CONTRATO:

### 5.1 Contrato Padrão (ex.: ano vigente)
- Aplicável a alunos pagantes regulares.
- Texto base institucional.
- Valores e regras vêm da matrícula e documentos normativos.

### 5.2 Contrato com Condição Especial
Exemplos:
- desconto de inauguração;
- condição histórica (ex.: contrato 2024).

Características:
- cláusulas específicas explicando a condição;
- perda do benefício em caso de rompimento, quando aplicável;
- **sem alterar a lógica financeira do sistema**.

### 5.3 Contrato / Termo de Bolsa
- Natureza jurídica distinta (benefício concedido).
- Pode coexistir com outros documentos (termos de contrapartida).
- Liquidação financeira ocorre fora do fluxo padrão de cobrança.

---

## 6. Variáveis Utilizadas em Contratos

Contratos utilizam **variáveis do domínio Documentos**.

Exemplos comuns:
- dados do aluno;
- dados do responsável financeiro;
- dados da matrícula;
- dados do curso/turma;
- valores calculados pela matrícula (snapshot).

Este documento **não define variáveis**.
O catálogo oficial está no domínio Documentos.

---

## 7. Emissão e Versionamento

- Cada contrato emitido é uma **instância imutável**.
- Alterações de texto exigem **nova versão de modelo**.
- O contrato emitido deve manter:
  - referência ao modelo utilizado;
  - snapshot de dados;
  - rastreabilidade de data e responsável.

---

## 8. Assinatura

A assinatura pode ocorrer:
- de forma física;
- de forma digital;
- por aceite eletrônico.

O método de assinatura:
- não altera o conteúdo do contrato;
- não altera regras financeiras;
- serve apenas como comprovação de concordância.

---

## 9. Diretriz final

Contrato:
- é um tipo de documento;
- é declarativo;
- é subordinado ao domínio Documentos;
- **nunca deve assumir responsabilidades operacionais ou financeiras**.

Qualquer novo modelo de contrato deve:
- respeitar este documento;
- respeitar o documento pai;
- respeitar os documentos normativos institucionais.

---

# Fim do documento
