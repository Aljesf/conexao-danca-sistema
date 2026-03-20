# Validacao - Ajuste de nomenclatura da fatura da conta interna

Data da validacao: 19/03/2026

## Antes

- titulo principal: `Fatura da educacao`
- identificacao superior: `Cartao Conexao - Educacao`
- card principal ainda trazia linguagem residual do dominio antigo
- bloco operacional principal usava `Cobranca canonica` como nomenclatura visivel ao usuario
- a pagina enviava `asChild` para o `Button`, mas o componente base em `src/components/ui/button.tsx` nao suporta essa prop

## Depois

- titulo principal: `Fatura da conta interna`
- identificacao superior: `Conta interna do aluno`
- subtitulo: `Leitura operacional da fatura, do pagamento NeoFin e da cobranca oficial vinculada.`
- card operacional principal passou a destacar:
  - `ID da fatura`
  - competencia da fatura
  - titular
  - conta interna do aluno
- bloco principal renomeado para `Cobranca oficial da fatura`
- textos de apoio passaram a usar `cobranca oficial` na leitura operacional
- a mencao tecnica a `cobranca canonica` ficou restrita ao bloco recolhivel de auditoria tecnica

## Textos corrigidos

- `Cartao Conexao - Educacao` -> `Conta interna do aluno`
- `Fatura da educacao` -> `Fatura da conta interna`
- `Leitura operacional da fatura, do pagamento NeoFin e da cobranca canonica.` -> `Leitura operacional da fatura, do pagamento NeoFin e da cobranca oficial vinculada.`
- `Cobranca canonica` -> `Cobranca oficial da fatura`
- `A invoice da cobranca canonica ja esta valida...` -> `A cobranca oficial da fatura ja possui invoice valida...`

## Erro asChild resolvido

Diagnostico:

- `src/components/ui/button.tsx` implementa apenas `ButtonHTMLAttributes<HTMLButtonElement> + variant`
- o componente nao suporta `asChild`
- havia uso incorreto de `asChild` na pagina da fatura, vazando a prop para DOM

Correcao aplicada:

- removido `asChild` dos pontos de uso na pagina
- links externos (`Abrir segunda via`, `Abrir QR Pix`) passaram para `<a>` estilizado com a mesma linguagem visual do botao secundario
- navegacao interna (`Abrir detalhe da cobranca`) passou para `<Link>` estilizado diretamente

Resultado:

- a prop `asChild` deixou de ser enviada para elementos DOM
- a pagina ficou compativel com o `Button` atual do projeto sem mexer na API global do componente

## Status final

- nomenclatura publica da tela alinhada com o dominio atual de conta interna do aluno
- nao restou mencao visivel a `educacao` ou `Cartao Conexao` na pagina operacional principal
- correcoes de componente aplicadas sem alterar SQL nem regra de API
- validacao tecnica concluida com lint direcionado e build
- homologacao visual autenticada continua pendente apenas porque a captura/acesso automatizado da area privada depende de sessao local valida
