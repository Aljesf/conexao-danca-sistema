# 📘 Design System – Modelo de Cards Acadêmicos  
**Padrão oficial de layout para: Cursos → Níveis → Conteúdos → Habilidades**

Este documento define o padrão visual e estrutural adotado no módulo Acadêmico, que deve ser replicado em qualquer tela futura que siga uma lógica de hierarquia.

Ele serve como modelo-base para:
- Cursos
- Níveis
- Conteúdos
- Habilidades
- Turmas
- CRM
- Movimento Conexão Dança
- Financeiro
- Qualquer módulo que exija organização hierárquica em camadas

---

# 🎨 1. PRINCÍPIOS DO MODELO

1. **Hierarquia visual clara**  
   A estrutura é sempre organizada de forma descendente:
   - Card Pai → Card Filho → Card Neto → Card Final

2. **TUDO é exibido em cards**, com:
   - fundo branco  
   - bordas arredondadas  
   - sombra suave  
   - padding interno generoso  
   - margens externas claras  

3. **Nenhum dado fica solto** fora de cards.

4. **Contexto primeiro, dados depois**  
   Cada tela começa com um Card de Contexto contendo informações essenciais do elemento selecionado.

5. **Modo Visualização vs Edição**  
   Botões de edição só aparecem no MODO EDITAR.

---

# 🏛 2. COMPONENTES-BASE DO MODELO

## ✔ 2.1 Card Pai (ex.: Curso)
Representa o nível mais alto da hierarquia.

Chaves:
- `titulo`  
- `subtitulo` (metodologia ou descrição)  
- `acoes` (Editar | Inativar) – exibidas somente no modo edição  
- `filhos` (níveis, turmas, etc.)

Características:
- Card grande  
- Espaço para “Novo item” ao lado do título (modo edição)  
- Padding forte  
- Cabeçalho claro e impactante

---

## ✔ 2.2 Card Filho (ex.: Nível)
O nível imediatamente abaixo do Card Pai.

Chaves:
- `nome`  
- `faixa_etaria` (gerado automaticamente)  
- `pre_requisito`  
- `observacoes`  
- `conteudos[]`

Características:
- Card médio  
- Aparência semelhante ao card de conteúdo (“Contexto do conteúdo”)  
- Indenta visualmente dentro do card pai

---

## ✔ 2.3 Card Neto (ex.: Conteúdo)
O nível abaixo do Card Filho.

Chaves:
- `nome`  
- `ordem`  
- `obrigatorio`  
- `descricao`  
- `habilidades[]`

Características:
- Card menor, com fundo levemente mais claro  
- Hierarquia bem marcada com margens verticais  
- “+ Nova habilidade” aparece somente no modo edição

---

## ✔ 2.4 Card Final (ex.: Habilidade)
Nível mais baixo da hierarquia.

Chaves:
- `nome`  
- `tipo`  
- `criterio_avaliacao`  
- `descricao`  
- `ordem`

Características:
- Card compacto  
- Nome em destaque  
- Linha inferior com critérios, tipo, ordem  
- Sem níveis abaixo dele

---

# 🔧 3. FUNCIONALIDADE DO MODO EDIÇÃO

## ✔ Botão Editar no Card Pai (curso)
Quando clicado:
- Exibe todos os botões internos:
  - + Novo nível
  - + Novo conteúdo
  - + Nova habilidade
  - Editar / Remover em todos os níveis e conteúdos
- Oculta no modo visualização para manter a tela limpa

## ✔ Botão “+ Novo …”
Cada tipo (curso, nível, conteúdo, habilidade) abre:
- Modal ou card expansível
- Campos com inputs visíveis (estilo Pessoa)
- Atualização imediata após salvar

---

# 📚 4. HIERARQUIA DO MODELO (JSON GENÉRICO)

Representação conceitual:

```json
{
  "curso": {
    "nome": "",
    "metodologia": "",
    "situacao": "",
    "niveis": [
      {
        "nome": "",
        "idade_minima": 0,
        "idade_maxima": 0,
        "faixa_etaria_sugerida": "",
        "pre_requisito": "",
        "observacoes": "",
        "conteudos": [
          {
            "nome": "",
            "ordem": 1,
            "obrigatorio": true,
            "descricao": "",
            "habilidades": [
              {
                "nome": "",
                "tipo": "",
                "criterio_avaliacao": "",
                "descricao": "",
                "ordem": 1
              }
            ]
          }
        ]
      }
    ]
  }
}
```

# 🎨 5. PADRÃO VISUAL (CSS Tailwind / Chakra Style)

- bg-white  
- rounded-lg  
- shadow-sm  
- border border-slate-200  
- p-4 ou p-6 para cards principais  
- mt-4 entre cards  

### Títulos
- text-lg font-semibold text-slate-800

### Subtítulos
- text-sm text-slate-600

### Links
- text-purple-600 font-medium

### Botões
- Primário: bg-purple-600 text-white rounded-full px-4 py-2 shadow  
- Secundário: border border-slate-300 rounded-full px-4 py-2

---

# 🎯 6. REGRAS DE ORDENAMENTO

- Níveis → ordenar **dos mais recentes para os mais antigos**  
- Conteúdos → ordenar por **ordem**  
- Habilidades → ordenar por **ordem**  
- Novos itens sempre aparecem **no topo**

---

# 🧩 7. REGRAS DE FORMULÁRIO

Os formulários usam **exatamente o mesmo estilo da tela de Pessoa**:

- bg-slate-50  
- border border-slate-300  
- rounded-lg  
- px-3 py-2  
- labels sempre acima  
- botão roxo para salvar  
- inputs visíveis e claros  
- nada apagado, nada sem borda

---

# 🧭 8. COMPORTAMENTO IDEAL

- Nada some da tela; **atualização inline**
- Jornada **Curso → Nível → Conteúdo → Habilidade** contínua
- Sem necessidade de trocar de rota para enxergar uma hierarquia
- Rotas secundárias existem só para **edição direta**
- Cards sempre empilhados em camadas claras

---

# 🗂 9. APLICAÇÕES FUTURAS DO MODELO

Este modelo pode ser reaplicado em:

- Turmas  
- CRM  
- Relatórios de progresso  
- Acompanhamento pedagógico  
- Movimento Conexão Dança  
- Financeiro (caixas, lançamentos)  
- Administrativo  
- Loja (AJ Dance Store)  
- Ballet Café  
- E qualquer módulo que precise apresentar dados hierárquicos

🟣 **A estrutura interna muda, mas o modelo visual permanece o mesmo.**
