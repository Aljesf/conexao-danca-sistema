📘 Guia — Repetir o padrão do Contexto Admin no Contexto Loja

Data: 2025-12-15
Projeto: Sistema Conexão Dança — AJ Dance Store
Responsável: Alírio de Jesus e Silva Filho

1) O padrão aplicado no Contexto Admin (o que funcionou)
1.1 Rota canônica sempre existe

Se o menu aponta para uma rota (ex.: /admin), a rota deve ter page.tsx.

Se não existir, vira 404.

1.2 Wrapper para “tela real fora do contexto”

Quando uma tela existia fora do /admin (ex.: em /config/...), foi adotado:

/admin/... vira canônico (rota do menu)

a tela real é renderizada via wrapper ou migrada para o caminho canônico

o caminho antigo vira wrapper/compatibilidade

1.3 Sidebar é “governança”, não inventário

Sidebar deve mostrar apenas o necessário e funcional.

Itens “futuros” devem ficar fora do menu, ou como placeholder explícito.

Quando uma tela funciona (mesmo simples), não precisa de marcador de “em construção”.

1.4 Auditoria / Governança separado

Auditoria e Construtor de Relatórios ficam em “Governança & Auditoria”.

Relatórios avulsos no menu foram removidos para evitar poluição.

1.5 Rotas quebradas = remover do menu

Se a equipe não precisa amanhã, tirar do menu.

(Opcional) manter placeholder interno só se necessário para não quebrar legado.

2) Como aplicar o mesmo padrão no Contexto Loja
2.1 Garantir a Home do contexto

Criar /loja com dashboard operacional.

2.2 Menu mínimo para operação amanhã

Manter:

Início (Dashboard Loja)

Frente de caixa

Produtos

Estoque

Fornecedores

Remover do menu por enquanto:

Pedidos da escola

Pedidos externos

Trocas & devoluções

Colaboradores da loja

2.3 Corrigir “movimentos de estoque”

A tela de estoque deve chamar um endpoint existente e estável.

Se o endpoint mudar, ajustar o fetch e tratar erros com fallback (não travar a tela).

2.4 Emojis e consistência

Padronizar emojis por bloco:

Início: 🏠

Caixa: 💳 / 🧾

Produtos: 🏷️ / 📦

Estoque: 📦 / 🔄

Fornecedores: 🚚 / 🧑‍💼

Fim do documento.
