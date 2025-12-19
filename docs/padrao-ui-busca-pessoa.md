# 📘 Padrão de UI — Busca e Vínculo de Pessoa (Regra Oficial)

## Regra obrigatória
Qualquer tela que precise vincular uma Pessoa deve usar o padrão:

- Buscar por 2+ caracteres (nome/e-mail/CPF)
- Selecionar em lista
- Se não encontrar, oferecer CTA "Cadastrar nova pessoa"

## Proibido
- Proibido pedir "Pessoa ID" para digitação manual em UI.

## Componente oficial
- `src/components/PessoaLookup.tsx`
- API: `GET /api/pessoas/busca?q=...`

## Observação
Esse padrão se aplica a:
- Usuários (admin)
- Comprador (loja/caixa)
- Colaboradores/Professores
- Matrículas
- Qualquer outra tela de vínculo
