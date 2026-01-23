# 📘 Governança de Acessos — Contextos, Rotas e Papéis (RBAC)
Sistema Conexão Dança (Conectarte)  
Versão: 1.1  
Status: Ativo (documento canônico)  
Responsável: Alírio de Jesus e Silva Filho  

## 0. Objetivo
Definir uma fonte única de verdade para **autorização** no sistema, com base no modelo real já implementado:

- **Admin Técnico** (superuser): `profiles.is_admin = true`
- **RBAC por Roles**: `usuario_roles` + `roles_sistema.permissoes` (JSON por módulo/ação)
- **Mapeamento Contexto/Rotas → Módulos/Ações**
- Regras claras de **Leitura (view)** vs **Mutação (create/update/delete)**

Este documento existe para eliminar tentativa manual, inconsistência e regressão:  
dada uma rota (página ou API), deve existir uma regra explícita aqui.

---

## 1. Modelo real (banco de dados) — referência técnica

### 1.1 Tabelas
- `profiles`
  - `id` (uuid = auth.users.id)
  - `is_admin` (boolean) → Admin Técnico

- `roles_sistema`
  - `id` (uuid)
  - `codigo` (text) — ex.: `ADMIN`, `PROFESSOR`, `SECRETARIA`
  - `permissoes` (json) — matriz por módulo e ação
  - `ativo` (boolean)

- `usuario_roles`
  - `id` (uuid)
  - `user_id` (uuid)
  - `role_id` (uuid → roles_sistema.id)

### 1.2 Estrutura do JSON de permissões (canônica)
`roles_sistema.permissoes` segue o padrão:

```json
{
  "modules": {
    "academico":   { "view": true, "create": false, "update": false, "delete": false },
    "matriculas":  { "view": true, "create": true,  "update": true,  "delete": false },
    "loja_operacao": { "view": true, "create": true, "update": true, "delete": false }
  }
}
```
1.3 Regra de composição (OR)
Um usuário pode ter múltiplos roles.
A permissão efetiva é a união (OR) de todos os roles:

Se qualquer role tiver modules.X.view = true, então o usuário tem view naquele módulo.

Idem para create/update/delete.

2. Admin Técnico (superuser) — regra de bypass
2.1 Definição
Admin Técnico = profiles.is_admin = true.

2.2 Efeito
Acesso total a todos os contextos/rotas/mutações.

Não depende de usuario_roles.

Bypassa toda validação RBAC.

Decisão institucional: Admin Técnico é o “Administrador Geral” na prática.

3. Roles existentes (catálogo atual do sistema)
A lista abaixo reflete os roles existentes no módulo Admin → Perfis.

3.1 Roles de administração e governança
ADMIN — Administrador (acesso total por RBAC)

ADMINISTRATIVO — Administrativo

COORDENACAO — Coordenação

SECRETARIA — Secretaria

3.2 Roles de auditoria
AUDITOR — Auditor do Sistema

AUDITORIA — Auditoria (Somente leitura)

3.3 Roles financeiros
FINANCEIRO_OPERACAO — Financeiro — Operação

3.4 Roles da Loja
LOJA_GESTAO — Loja — Gestão

LOJA_OPERACAO — Loja — Operação (Caixa)

3.5 Roles acadêmicos
PROFESSOR — Professor

3.6 Role temporário (quando existir)
EQUIPE_CADASTRO_BASE — Equipe — Cadastro Base (Temporário)

Observação: novos roles só podem ser criados se forem registrados aqui e tiverem permissões coerentes em roles_sistema.permissoes.

4. Módulos (keys) usados no RBAC — catálogo
Os módulos abaixo devem ser tratados como chaves canônicas (conforme já aparece em roles_sistema.permissoes):

admin

usuarios_seguranca

pessoas

academico

matriculas

financeiro

auditoria

relatorios

loja_admin

loja_operacao

ballet_cafe

colaboradores

comunicacao

Regra: toda autorização deve mapear rota → módulo → ação (view/create/update/delete).

5. Contextos e política de acesso (páginas)
5.1 Contexto Administração (Admin)
Páginas: /admin/**

Regra recomendada (padrão atual): somente Admin Técnico

Motivo: reduzir superfície de risco e complexidade.

Exceção futura (se necessário): permitir via RBAC modules.admin.view = true (registrar aqui se mudar).

5.2 Contexto Escola
Páginas: /escola/**

Regra: usuário autenticado pode acessar leitura base do contexto.

Mutações seguem RBAC.

5.3 Contexto Acadêmico (subdomínio dentro da Escola)
Páginas: /escola/academico/**

Leitura: autenticado (regra institucional)

Mutações: RBAC modules.academico.create/update/delete

5.4 Contexto Loja
Páginas: /loja/**

Regra: RBAC

Operação: modules.loja_operacao.view = true

Gestão: modules.loja_admin.view = true

Admin Técnico sempre bypassa.

5.5 Contexto Café
Páginas: /cafe/**

Regra: RBAC modules.ballet_cafe.view = true

Admin Técnico sempre bypassa.

6. Política de leitura base (institucional)
6.1 Regra institucional do Conexão Dança (padrão)
Dentro do ambiente autenticado da escola:

Todos podem ver:

cursos (academico.view)

alunos matriculados (matriculas.view)

listagens básicas (pessoas.view)

6.2 Mutações são restritas
Criar/editar/excluir exige RBAC por módulo/ação (ou Admin Técnico).

Exemplo: “ver cursos” é livre para autenticado; “editar cursos” exige permissão acadêmica.

7. Mapa de rotas (API) — regra por método
7.1 Regra padrão (obrigatória)
GET → exige autenticação e aplica política de leitura base

POST/PUT/PATCH/DELETE → exige RBAC por módulo/ação (ou Admin Técnico)

7.2 Exemplo prático — Cursos
GET /api/escola/academico/cursos

Permitir para qualquer autenticado (regra institucional)

POST /api/escola/academico/cursos

Exigir modules.academico.create = true ou Admin Técnico

PATCH /api/escola/academico/cursos

Exigir modules.academico.update = true ou Admin Técnico

DELETE /api/escola/academico/cursos

Exigir modules.academico.delete = true ou Admin Técnico

8. Implementação recomendada (padrão de código)
8.1 Helper canônico (server)
A aplicação deve ter um helper único para evitar regras divergentes:

requireUser() → garante autenticado

isTechAdmin(userId) → profiles.is_admin

getEffectivePermissions(userId):

buscar roles do usuário em usuario_roles

carregar roles_sistema.permissoes

unir (OR) tudo em um “PermissionMap”

can(permissionMap, moduleKey, action) → boolean

8.2 UI: esconder botões é UX, não segurança
UI pode esconder botões sem permissão

Segurança real deve estar na API (server-side)

9. Processo de diagnóstico (padrão)
Quando surgir “usuário não vê tela X”:

Identificar a rota que falhou (página e/ou API)

Mapear rota → módulo → ação

Verificar:

é Admin Técnico? (profiles.is_admin)

quais roles tem? (usuario_roles)

permissões efetivas? (OR do JSON)

Ajustar a regra (preferência: corrigir autorização no server)

Atualizar este documento se uma regra nova nasceu

10. Próximas revisões (planejadas)
Consolidar lista real de páginas por contexto (rotas existentes no repositório).

Padronizar seeds/CRUD de roles com base em roles_sistema.permissoes.

Criar (mais adiante) uma tela Admin (somente Admin Técnico) para atribuir roles a usuários com auditoria.

Fim do documento — docs/governanca-acessos-contextos-rotas.md
