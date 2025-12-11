# 🎨 Padrão Oficial de Ícones — Sistema Conexão Dança  
**Versão:** 1.1  
**Última atualização:** 28-11-2025  
**Responsável:** Alírio de Jesus e Silva Filho  

> **Esta versão substitui a v1.0.**  
> A principal mudança é que **navegação (sidebar, abas, menus)** passa a usar **emojis como ícones oficiais**, enquanto **@phosphor-icons/react** continua sendo a **biblioteca única para ícones vetoriais** usados dentro dos componentes.

Este documento define como os ícones devem ser usados em TODO o sistema Conexão Dança, para evitar erros de importação, inconsistência visual e problemas de build.

Ele segue as regras de rastreabilidade entre chats e deve ser considerado **fonte de verdade para o Codex** quando estiver gerando ou alterando código.

---

## 1. Objetivo

- Ter **uma única biblioteca oficial de ícones vetoriais** para o sistema.  
- Definir que **navegação** (sidebar, abas, menus) utiliza **emojis** em vez de componentes de ícone.  
- Evitar erros de build causados por ícones que “não existem” no módulo.  
- Garantir que o Codex e qualquer pessoa desenvolvedora usem o **mesmo padrão**.

---

## 2. Ícones de navegação (OFICIAL: emojis)

### 2.1 Onde usar emojis

Emojis devem ser usados como ícones em:

- **Sidebar** (todos os contextos: escola, loja, café, admin)  
- **Abas** (tabs) como as da tela de Pessoa  
- Pequenos menus de navegação, atalhos, chips de filtro etc.

Nesses casos, o tipo do ícone no código deve ser **string**, por exemplo:

```ts
type SidebarItem = {
  label: string;
  href: string;
  icon?: string; // emoji
};
Exemplos:

ts
Copiar código
{ label: "Início", href: "/escola", icon: "🏠" },
{ label: "Frente de caixa", href: "/escola/caixa", icon: "🧾" },
{ label: "Pessoas", href: "/pessoas", icon: "👤" },
{ label: "Financeiro (Admin)", href: "/admin/financeiro", icon: "📊" },
Regra para o Codex:
Sempre que estiver trabalhando em sidebar, abas ou navegação, usar emojis como ícones (string) e NÃO importar bibliotecas de ícones para isso.

2.2 Convenções para emojis
Tamanho padrão: renderizar em <span className="text-lg leading-none"> ou similar.

Cor: emoji já é colorido, não precisa estilizar.

Manter coerência sem ficar obcecado – priorizar sentido intuitivo:

Início → 🏠

Pessoas → 👤 / 👥

Financeiro → 💸 / 🧾 / 📊

Loja → 🛍️ / 🎽

Café → ☕

Configurações → ⚙️

Ajuda → ❓

3. Biblioteca oficial de ícones vetoriais
✅ 3.1 Biblioteca ÚNICA autorizada
Biblioteca oficial: @phosphor-icons/react
Site: https://phosphoricons.com

Ela é usada para:

Ícones em botões, cards, componentes internos, gráficos, status etc.

Qualquer lugar onde um emoji não seja suficiente ou fique visualmente pobre.

🚫 3.2 Bibliotecas proibidas
As bibliotecas abaixo NÃO DEVEM SER USADAS neste projeto, exceto se houver nova atualização deste documento:

react-icons (QUALQUER subpacote, ex.: react-icons/fa, react-icons/md, etc.)

lucide-react

@heroicons/react

Regra para o Codex:
Sempre que precisar de um ícone vetorial (componente), usar apenas @phosphor-icons/react.
Se o usuário pedir explicitamente outra biblioteca, avisar que isso quebra o padrão e só prosseguir com confirmação.

4. Instalação da biblioteca Phosphor
No projeto Next.js do Sistema Conexão Dança:

bash
Copiar código
npm install @phosphor-icons/react
# ou
yarn add @phosphor-icons/react
Exemplo de import padrão:

tsx
Copiar código
import {
  House,
  Users,
  UserCircle,
  CalendarBlank,
  ShoppingCartSimple,
  Storefront,
  Coffee,
  Package,
  GearSix,
  ShieldCheck,
  FileText,
  ChartBar,
} from "@phosphor-icons/react";
Uso básico:

tsx
Copiar código
<House size={24} weight="regular" />
<Users size={24} weight="regular" />
<GearSix size={20} weight="duotone" />
4.1 Convenções de estilo
Tamanho padrão: size={20} para textos e itens de lista; size={24} para ícones principais.

Peso padrão: weight="regular".

Cor: preferencialmente herdada via CSS (color: currentColor), sem definir color direto no componente, exceto exceções controladas.

5. Componente auxiliar de ícone (AppIcon)
Arquivo sugerido: src/components/ui/Icon.tsx

tsx
Copiar código
"use client";

import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";

export type IconComponent = (props: PhosphorIconProps) => JSX.Element;

export type AppIconProps = {
  icon: IconComponent;
  size?: number;
  weight?: PhosphorIconProps["weight"];
  className?: string;
};

export function AppIcon({
  icon: Icon,
  size = 20,
  weight = "regular",
  className,
}: AppIconProps) {
  return <Icon size={size} weight={weight} className={className} />;
}
Uso:

tsx
Copiar código
import { House } from "@phosphor-icons/react";
import { AppIcon } from "@/components/ui/Icon";

<AppIcon icon={House} size={24} />;
Regra:
AppIcon é para ícones vetoriais Phosphor.
Sidebar/abas NÃO usam AppIcon, usam emojis diretamente.

6. Ícones recomendados por domínio (Phosphor)
Esta seção continua valendo para componentes internos, não para o sidebar.

6.1 Escola / Início
Início / Dashboard Escola → House

Ícone geral de pessoa → UserCircle

Listas de pessoas/alunos → Users

Captação (CRM) → UserPlus (ou Users)

Grupos de alunos / movimento social → UsersThree (ou Users)

6.2 Acadêmico (cursos, turmas, frequência)
Cursos, níveis, módulos, avaliações → ClipboardText

Turmas → ChalkboardTeacher

Grade → SquaresFour

Frequência → CheckSquare

Se algum ícone não existir, usar temporariamente ClipboardText e registrar com comentário // TODO: definir ícone oficial.

6.3 Calendário
Calendário geral, eventos internos, externos e feriados → CalendarBlank

6.4 Financeiro
Dashboard financeiro → ChartBar

Contas a pagar / receber → CreditCard

Caixa / movimento → CurrencyDollarSimple

Lançamentos manuais → NotePencil

6.5 Loja – AJ Dance Store
Painel Loja → Storefront

Frente de caixa → ShoppingCartSimple

Produtos / Estoque → Package

Pedidos da escola / externos → ClipboardText

6.6 Ballet Café
Painel Café → Coffee

Comandas / Pedidos → ClipboardText

Estoque da cozinha → Package

6.7 Administração do Sistema
Painel de administração → GearSix

Usuários / Perfis / Permissões → ShieldCheck

Colaboradores / vínculos / funções / jornadas → UsersThree

Contratos / modelos → FileText

Integrações → PlugsConnected (se não existir, usar GearSix)

Auditoria → MagnifyingGlass

Relatórios → ChartBar

7. Regras específicas para o Codex
Quando estiver gerando ou alterando código:

Sidebar, abas, menus de navegação

Usar SEMPRE emojis (string) no campo icon.

Não importar bibliotecas de ícones para esses casos.

Componentes internos (cards, botões, status etc.)

Usar SEMPRE @phosphor-icons/react.

Importar apenas a partir de @phosphor-icons/react.

Nunca usar react-icons, lucide-react, @heroicons/react.

Se precisar de um ícone novo:

Para navegação → escolha um emoji coerente.

Para componente → tente primeiro um ícone da lista acima.

Se não tiver certeza do nome, use um ícone genérico que exista (House, Users, GearSix, CalendarBlank, etc.) e comente // TODO.

8. Atualização deste documento
Qualquer alteração importante (troca de biblioteca, mudança de estratégia de emojis, etc.) deve gerar uma nova versão deste arquivo (v1.2, v2.0, etc.).

Registrar sempre no topo:

nova versão

data

resumo da alteração

9. Resumo rápido
✅ Navegação (sidebar, abas) → usar emojis como ícones.

✅ Ícones vetoriais em componentes → usar apenas @phosphor-icons/react.

🚫 Proibidos: react-icons, lucide-react, @heroicons/react.

✅ Manter coerência visual com os exemplos deste documento.

Este documento é a referência oficial de ícones do Sistema Conexão Dança (versão 1.1).