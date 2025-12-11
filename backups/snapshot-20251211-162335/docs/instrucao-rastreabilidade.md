[INÍCIO DO ARQUIVO] docs/instrucao_rastreabilidade.md

# 📘 Instrução de Rastreabilidade – Sistema Conexão Dança

Este documento define como o Codex deve gerar e registrar alterações no repositório.

## 🔹 Regra Geral

Sempre que o Codex CRIAR ou EDITAR um arquivo no projeto, ele deve envolver o conteúdo em um bloco de rastreabilidade com o seguinte padrão:

[INÍCIO DO BLOCO] caminho/do/arquivo.ext  
(linha prevista XX)  
... código gerado aqui ...  
[FIM DO BLOCO]

### ✔ Cada arquivo deve ter UM ÚNICO bloco por operação  
### ✔ Nunca misturar blocos  
### ✔ Bloco sempre começa com `[INÍCIO DO BLOCO]` e termina com `[FIM DO BLOCO]`  

## 🔹 Exemplo de edição

[INÍCIO DO BLOCO] src/app/(private)/academico/cursos/page.tsx  
(linha prevista 1)  
export default function Cursos() { ... }  
[FIM DO BLOCO]

## 🔹 Por que isso é obrigatório?

- Facilita rastrear arquivos alterados  
- Evita sobrescritas acidentais  
- Mantém histórico claro  
- Permite organização do projeto mesmo com geração automática

[ FIM DO ARQUIVO ]
