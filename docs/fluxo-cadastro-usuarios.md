# 📘 Fluxo de Cadastro de Usuários — Sistema Conexão Dança

## Conceitos
- Pessoa: registro civil/administrativo (tabela pessoas).
- Usuário: conta de login (Supabase Auth).
- Profile: ponte entre usuário e pessoa (tabela profiles: user_id + pessoa_id).
- Role (papel): permissões no sistema (tabelas roles_sistema e usuario_roles).

## Fluxo correto (admin)
1) Criar/selecionar Pessoa (pessoas)
2) Criar Usuário (Supabase Auth)
3) Criar/atualizar Profile (profiles.user_id + profiles.pessoa_id)
4) Atribuir Roles (usuario_roles -> roles_sistema)

## UI recomendada
- Cadastro de usuários deve existir em /admin/usuarios
- Criar página /admin/usuarios/novo com 3 passos (wizard simples)
