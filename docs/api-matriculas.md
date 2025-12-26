> ℹ️ DOCUMENTO EM ADEQUAÇÃO  
> Este documento será atualizado para refletir  
> as Regras Oficiais de Matrícula (Conexão Dança) – v1

# 📘 API — Matrículas  
Sistema Conexão Dança  
Versão: 2025-12-02  

## 0. Contexto

Este documento define a **API oficial de Matrículas**, começando pelo endpoint:

- `POST /api/matriculas/novo`

Objetivo da rota:

- Criar uma **nova matrícula** na tabela `matriculas` (fonte oficial de vínculo pedagógico/financeiro).
- Criar o **vínculo operacional** em `turma_aluno` associando a pessoa à turma com `matricula_id`.

Escopo da **Fase 1**:

- Matrículas para **turmas regulares** (principalmente `tipo_matricula = 'REGULAR'`) e **cursos livres**, usando:
  - `pessoa_id` e `responsavel_financeiro_id` **já existentes** em `pessoas`;
  - `vinculo_id` apontando para `turmas.turma_id` (no caso de REGULAR/CURSO_LIVRE).
- Não cria pessoas novas.
- Não cria turmas novas.
- Não gera contratos nem cobranças automaticamente (isso será tratado em etapas posteriores).

---

## 1. Rota e Método

- **Método:** `POST`  
- **URL:** `/api/matriculas/novo`  
- **Formato de corpo:** `application/json`  
- **Resposta:** `application/json`  

A rota será implementada em:

- `src/app/api/matriculas/novo/route.ts`

---

## 2. Autenticação e Permissões

- A rota exige **usuário autenticado** (via Supabase Auth / middleware padrão do projeto).  
- Apenas usuários com permissão adequada podem criar matrículas. Exemplo (conceitual):

  - Roles permitidos: `ADMIN`, `SECRETARIA`, `COORDENACAO`, ou outro grupo definido em `roles_sistema`.  
  - A verificação de permissão pode checar:
    - o role no `profiles` + `usuario_roles`;  
    - e/ou um campo de permissões em `roles_sistema.permissoes` (JSONB).

> Implementação concreta de permissão fica na camada de auth/middleware. Aqui, a regra é: **se não autorizado → HTTP 403**.

---

## 3. Payload do `POST /api/matriculas/novo`

### 3.1. Estrutura Geral

Corpo esperado (JSON):

```json
{
  "pessoa_id": 123,
  "responsavel_financeiro_id": 456,
  "tipo_matricula": "REGULAR",
  "vinculo_id": 789,
  "ano_referencia": 2025,
  "data_matricula": "2025-02-10",
  "observacoes": "Matrícula feita na recepção.",
  "origem": "painel_admin",
  "criar_vinculo_turma": true
}
```

### 3.2. Campos Detalhados

| Campo                     | Tipo             | Obrigatório | Observações                                                                                                                                           |
| ------------------------- | ---------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| pessoa_id                 | integer          | ✔️          | `pessoas.id` da pessoa que está sendo matriculada (aluno). Deve existir em `pessoas`.                                                                 |
| responsavel_financeiro_id | integer          | ✔️          | `pessoas.id` do responsável financeiro. Pode ser igual ao `pessoa_id` (maior de idade) ou diferente (pai/mãe/responsável). Deve existir em `pessoas`. |
| tipo_matricula            | string           | ✔️          | Deve ser um dos valores: `REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO`. Na Fase 1, foco em REGULAR e CURSO_LIVRE.                                     |
| vinculo_id                | integer          | ✔️          | Para REGULAR/CURSO_LIVRE: `turmas.turma_id` da turma em que o aluno será matriculado. No futuro, também poderá ser id de projeto artístico.           |
| ano_referencia            | integer          | ⬜ / cond.   | Obrigatório quando `tipo_matricula = 'REGULAR'` (ano letivo). Para outros tipos, pode ser opcional ou ignorado.                                       |
| data_matricula            | string (date)    | ⬜           | Data da matrícula. Se não for enviada, a API usará a data do servidor (current_date). Também pode ser usada como `dt_inicio` em `turma_aluno`.        |
| observacoes               | string           | ⬜           | Observações internas sobre a matrícula (texto livre).                                                                                                |
| origem                    | string           | ⬜           | Fonte da criação: ex.: `painel_admin`, `app_responsavel`, `importacao`. Ajuda em auditoria.                                                          |
| criar_vinculo_turma       | boolean          | ⬜ (default true) | Se true, cria também o registro em `turma_aluno`. Em casos avançados (migração manual), pode ser false.                                               |

Campos como `plano_matricula_id`, `contrato_modelo_id`, `contrato_emitido_id` não são tratados nesta fase pela rota; serão adicionados quando o fluxo de contratos/cobranças estiver fechado.

---

## 4. Regras de Validação

### 4.1. Validações Básicas de Tipo/Formato

- `pessoa_id`: obrigatório, inteiro > 0.
- `responsavel_financeiro_id`: obrigatório, inteiro > 0.
- `tipo_matricula`: obrigatório, string, limitado aos valores da enum.
- `vinculo_id`: obrigatório, inteiro > 0.
- `ano_referencia`:
  - obrigatório se `tipo_matricula = 'REGULAR'`;
  - se presente, deve ser >= 2000 e <= (ano_atual + 1).
- `data_matricula` (se presente): deve ser data válida no formato ISO `YYYY-MM-DD`.
- `observacoes`: se presente, string não absurdamente longa (ex.: limitar a 2000 caracteres).
- `origem`: se presente, string curta (ex.: até 100 caracteres).
- `criar_vinculo_turma`: se presente, boolean.

Se qualquer validação básica falhar → HTTP 400 (Bad Request) com detalhes.

### 4.2. Validações de Existência

- `pessoa_id` deve existir em `pessoas` e estar marcada como ativa (se houver flag de ativo).
- `responsavel_financeiro_id` deve existir em `pessoas` e preferencialmente estar ativa.
- `vinculo_id` deve existir em `turmas` e a turma deve estar em situação que permita matrícula (ex.: `status IN ('ATIVA', 'ABERTA_INSCRICOES')` — ajustar à realidade).

Se alguma dessas entidades não for encontrada → HTTP 404 (Not Found) com mensagem adequada (ex.: `"pessoa_nao_encontrada"`, `"responsavel_nao_encontrado"`, `"turma_nao_encontrada"`).

### 4.3. Regras de Negócio (Matrículas Duplicadas)

Para `tipo_matricula = 'REGULAR'`, não deve existir outra matrícula ativa do mesmo tipo para a mesma pessoa na mesma turma e ano, por exemplo:

Buscar em `matriculas`:

- `pessoa_id = payload.pessoa_id`
- `tipo_matricula = 'REGULAR'`
- `vinculo_id = payload.vinculo_id`
- `ano_referencia = payload.ano_referencia`
- `status IN ('ATIVA', 'TRANCADA')` (ajustar à regra interna)

Se já existir, a rota deve retornar HTTP 409 (Conflict) com um erro tipo `"matricula_duplicada"` e, opcionalmente, os dados básicos da matrícula existente.

Essa regra deve ser compatível com a futura constraint parcial:

```sql
UNIQUE (pessoa_id, tipo_matricula, vinculo_id)
WHERE tipo_matricula = 'REGULAR';
```

### 4.4. Validações de Responsável Financeiro

- Permitir que `responsavel_financeiro_id = pessoa_id` (ex.: adulto que paga a própria matrícula).
- Se `responsavel_financeiro_id != pessoa_id`, no futuro a API pode (opcionalmente) validar se existe um vínculo em `vinculos` (aluno ↔ responsável). Nesta fase, isso pode ser apenas uma recomendação, não bloqueante.

---

## 5. Fluxo Interno da Rota

A operação deve ser feita em transação (uma única transação no banco):

### 5.1. Passos (alto nível)

1. Validar autenticação/role.
2. Ler e validar o payload (estrutura e tipos).
3. Validar existência de `pessoa_id`, `responsavel_financeiro_id` e turma (`vinculo_id`).
4. Verificar se já existe matrícula duplicada (regra de negócio).
5. Criar registro em `matriculas`.
6. Se `criar_vinculo_turma = true`, criar registro em `turma_aluno`.
7. Retornar a matrícula criada e o vínculo da turma (se criado).

### 5.2. Pseudo-fluxo Detalhado

```ts
// 1. Autenticação e permissão
const user = requireAuth(request);
assertHasRole(user, ["ADMIN", "SECRETARIA", "COORDENACAO"]);

// 2. Validar payload básico
const payload = await request.json();
// ... validações de tipo/campos obrigatórios ...

// 3. Buscar entidades
const pessoa = await db.pessoas.findById(payload.pessoa_id);
if (!pessoa) return 404;

const responsavel = await db.pessoas.findById(payload.responsavel_financeiro_id);
if (!responsavel) return 404;

const turma = await db.turmas.findById(payload.vinculo_id);
if (!turma) return 404;

// 4. Regra de duplicidade (REGULAR)
if (payload.tipo_matricula === "REGULAR") {
  const existente = await db.matriculas.findOne({
    pessoa_id: payload.pessoa_id,
    tipo_matricula: "REGULAR",
    vinculo_id: payload.vinculo_id,
    ano_referencia: payload.ano_referencia,
    status_in: ["ATIVA", "TRANCADA"],
  });

  if (existente) {
    return Response.json(
      { error: "matricula_duplicada", matricula: existente },
      { status: 409 }
    );
  }
}

// 5. Iniciar transação
await db.transaction(async (tx) => {
  // 5.1. Criar matrícula
  const matricula = await tx.matriculas
    .insert({
      pessoa_id: payload.pessoa_id,
      responsavel_financeiro_id: payload.responsavel_financeiro_id,
      tipo_matricula: payload.tipo_matricula,
      vinculo_id: payload.vinculo_id,
      ano_referencia: payload.ano_referencia ?? null,
      data_matricula: payload.data_matricula ?? today(),
      status: "ATIVA",
      observacoes: payload.observacoes ?? null,
      // campos de auditoria (created_by etc.) derivados do user
    })
    .returning("*");

  let turmaAluno = null;

  // 5.2. Criar vínculo em turma_aluno (opcional)
  if (payload.criar_vinculo_turma !== false) {
    turmaAluno = await tx.turma_aluno
      .insert({
        turma_id: payload.vinculo_id,
        aluno_pessoa_id: payload.pessoa_id,
        dt_inicio: payload.data_matricula ?? today(),
        status: "ativo", // ajustar ao enum real
        matricula_id: matricula.id,
      })
      .returning("*");
  }

  // 5.3. Retornar resultado
  return { matricula, turmaAluno };
});
```

Observações:

- A transação deve garantir que ou ambos os registros (`matriculas` e `turma_aluno`) são criados, ou nenhum é.
- Em caso de erro na inserção de `turma_aluno`, a matrícula também deve ser revertida.

---

## 6. Respostas da API

### 6.1. Sucesso

- HTTP 201 (Created)

Exemplo de corpo:

```json
{
  "ok": true,
  "matricula": {
    "id": 1001,
    "pessoa_id": 123,
    "responsavel_financeiro_id": 456,
    "tipo_matricula": "REGULAR",
    "vinculo_id": 789,
    "ano_referencia": 2025,
    "data_matricula": "2025-02-10",
    "data_encerramento": null,
    "status": "ATIVA",
    "observacoes": "Matrícula feita na recepção.",
    "created_at": "2025-02-10T12:00:00Z",
    "created_by": "user-uuid",
    "updated_at": "2025-02-10T12:00:00Z",
    "updated_by": "user-uuid"
  },
  "turma_aluno": {
    "turma_aluno_id": 5555,
    "turma_id": 789,
    "aluno_pessoa_id": 123,
    "dt_inicio": "2025-02-10",
    "dt_fim": null,
    "status": "ativo",
    "matricula_id": 1001
  }
}
```

Se `criar_vinculo_turma = false`, o campo `"turma_aluno"` pode vir como null ou simplesmente não ser incluído.

### 6.2. Erros Esperados

- 400 — Bad Request  
  Payload malformado, campos obrigatórios ausentes ou invalidos.  
  Exemplo:

  ```json
  {
    "ok": false,
    "error": "payload_invalido",
    "details": {
      "tipo_matricula": "valor_invalido",
      "ano_referencia": "obrigatorio_para_regular"
    }
  }
  ```

- 401 — Unauthorized  
  Usuário não autenticado.

- 403 — Forbidden  
  Usuário autenticado, mas sem permissão para criar matrícula.

- 404 — Not Found  
  Pessoa, responsável ou turma não encontrada.  
  Exemplo:

  ```json
  {
    "ok": false,
    "error": "turma_nao_encontrada"
  }
  ```

- 409 — Conflict  
  Matrícula já existente para aquele conjunto (pessoa, turma, ano, tipo).  
  Exemplo:

  ```json
  {
    "ok": false,
    "error": "matricula_duplicada",
    "matricula": {
      "id": 1000,
      "pessoa_id": 123,
      "tipo_matricula": "REGULAR",
      "vinculo_id": 789,
      "ano_referencia": 2025,
      "status": "ATIVA"
    }
  }
  ```

- 500 — Internal Server Error  
  Erro inesperado no servidor ou no banco. A resposta deve não expor detalhes sensíveis de stack trace, apenas um código genérico e um `request_id` ou similar para auditoria/log.

---

## 7. Considerações Futuras (Extensões da Rota)

A rota `POST /api/matriculas/novo` poderá ser expandida em versões futuras para:

- Criar pessoa e responsável automaticamente, caso não existam (`pessoa_nova`, `responsavel_novo`).
- Gerar contrato (HTML/PDF) com base em `contrato_modelo_id` e anexar aos campos:
  - `contrato_emitido_id`
  - `contrato_pdf_url`
- Criar o plano financeiro e cobranças associados:
  - vincular `matriculas` → `cobrancas` / `recebimentos`.
- Suportar outros tipos de matrícula (`PROJETO_ARTISTICO`) onde `vinculo_id` aponte para projetos/eventos em vez de turmas regulares.
- Registros complementares:
  - criação automática de vínculos em `vinculos` (aluno ↔ responsável), quando fizer sentido;
  - logs detalhados em `auditoria_logs`.

Estas extensões devem manter a mesma estrutura básica de validação, transação e resposta, apenas adicionando novos passos após a criação da matrícula.
