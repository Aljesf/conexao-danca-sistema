📘 Modelo de Contratos Acadêmicos e Artísticos — Conexão Dança

Versão: 1.0
Data: 30/11/2025
Responsável: Alírio de Jesus e Silva Filho
Status: Documento base do módulo de Contratos

Local sugerido no repositório:
docs/modelo-de-contratos-academicos-e-artistico.md

1. Objetivo do Módulo de Contratos

O módulo de Contratos centraliza todos os textos jurídicos utilizados no processo de matrícula:

Contrato Escolar (REGULAR)

Contrato de Curso Livre (CURSO_LIVRE)

Contrato de Projeto Artístico (PROJETO_ARTISTICO)
(espetáculos, festivais, mostras, eventos artísticos em geral)

O módulo permite:

ter modelos atualizáveis, com versões;

usar placeholders que são preenchidos automaticamente na matrícula;

gerar PDFs para assinatura;

manter histórico dos modelos ao longo dos anos;

vincular um modelo a Planos de Matrícula (financeiro) e às entidades acadêmicas e artísticas.

Este documento padroniza a arquitetura.

2. Localização no Sistema

Conforme a estrutura oficial do Sidebar , contratos pertencem ao Contexto Administração:

/admin
/admin/config/contratos  ← módulo de gerenciamento


Contratos NÃO ficam visíveis para o público, somente para administradores.

3. Tipos de Contratos (enum)

Campo: tipo_contrato

Tipo	Descrição
REGULAR	Aulas regulares do ano letivo (turmas REGULAR).
CURSO_LIVRE	Workshops, intensivos, cursos fechados (turmas CURSO_LIVRE).
PROJETO_ARTISTICO	Espetáculos, festivais, mostras e eventos artísticos.

Esses três tipos cobrem os três tipos de matrícula definidos no documento Modelo de Matrículas .

4. Estrutura da Tabela contratos_modelo
4.1. Campos
Campo	Tipo	Descrição
id	PK	Identificador
tipo_contrato	enum	REGULAR / CURSO_LIVRE / PROJETO_ARTISTICO
titulo	text	Nome do contrato (“Contrato Escolar 2026”)
versao	text	Ex.: “v1.0”, “v2.1”
texto_modelo	text	Texto completo com placeholders
ativo	boolean	Indica se o modelo está liberado para uso
created_at	timestamp	Registro
updated_at	timestamp	Última modificação
observacoes	text	Uso interno
4.2. Regras de versão

Cada contrato pode ter múltiplas versões.

Apenas um contrato por tipo pode estar ativo simultaneamente.

Versões antigas devem permanecer acessíveis para auditoria e histórico.

5. Placeholders Oficiais

Os contratos NÃO guardam valores diretamente.
Todos os valores vêm do Plano Financeiro (documento oficial) e da Matrícula.

Os placeholders são substituídos automaticamente.

5.1 Dados do Aluno
Placeholder	Descrição
{{NOME_ALUNO}}	Nome completo
{{DATA_NASCIMENTO_ALUNO}}	Data de nascimento
{{CPF_ALUNO}}	Quando existir
{{RESPONSAVEL_FINANCEIRO}}	Nome
{{CPF_RESPONSAVEL_FINANCEIRO}}	CPF

Responsáveis vêm da entidade pessoas, conforme Visão Geral do Sistema.

5.2 Dados Pedagógicos

Para matrícula REGULAR:

{{NOME_TURMA}}

{{TIPO_TURMA}}

{{CURSO}}

{{NIVEL}}

{{TURNO}}

{{ANO_LETIVO}}

Para CURSO_LIVRE:

{{NOME_CURSO}}

{{DATA_INICIO}}

{{DATA_FIM}}

Para PROJETO_ARTISTICO:

{{NOME_PROJETO_ARTISTICO}}

{{TIPO_PROJETO}} (espetáculo, festival, mostra…)

{{ANO_PROJETO}}

{{NOME_COREOGRAFIA}} (quando aplicável)

Essas informações vêm dos módulos Turmas e Projetos Artísticos (a ser criado).

5.3 Dados Financeiros

Todos os valores vêm do módulo Planos de Matrícula e do Modelo Financeiro .

Placeholder	Descrição
{{VALOR_MENSALIDADE}}	Mensalidade da turma regular
{{VALOR_MATRICULA}}	Taxa de matrícula
{{VALOR_INSCRICAO}}	Taxa de curso livre
{{VALOR_PARTICIPACAO}}	Taxa do projeto artístico
{{VALOR_FIGURINO}}	Taxa de figurino (quando existir)
{{MULTA_PERCENTUAL}}	Multa por atraso
{{JUROS_DIARIO}}	Juros por dia de atraso
{{DIA_VENCIMENTO}}	Dia padrão de cobrança
{{NUMERO_PARCELAS}}	Parcelas para cursos livres ou eventos
{{DISCRIMINACAO_VALORES}}	Bloco automático com tabela: mensalidade / taxas / parcelas
5.4 Dados Administrativos
Placeholder	Descrição
{{DATA_ASSINATURA}}	Preenchido no momento da assinatura
{{DATA_GERACAO_CONTRATO}}	Data de criação
{{USUARIO_RESPONSAVEL}}	Usuário do sistema que realizou a matrícula

Esses dados vêm da auditoria e do fluxo de Matrícula.

6. Estrutura do Texto de Contrato (modelo sugerido)

Todos os contratos devem ter as mesmas seções base:

Identificação das partes

Escola + aluno + responsável financeiro
(dados vindos de pessoas e matrículas)

Objeto do contrato

Descrever conforme o tipo de matrícula:

prestação de serviços educacionais (REGULAR)

prestação de serviço artístico-cultural (PROJETO_ARTISTICO)

prestação de serviço técnico-formativo (CURSO_LIVRE)

Carga horária / duração

Usar datas e horários da turma ou do projeto.

Obrigações da Escola

Comunicação

Oferta das aulas

Professores

Segurança

Obrigações do Responsável

Pontualidade

Cumprimento das regras

Pagamentos

Valores, multas e juros

Alimentar via placeholders ligados ao plano financeiro.

Trancamento, desistência e cancelamento

Deve estar alinhado ao módulo de Matrículas .

Direitos de imagem (especialmente PROJETO_ARTISTICO)

Assinatura

Data + nome do responsável

Assinatura manual/digital/eletrônica (integração futura)

7. Geração do Contrato no Fluxo de Matrícula

O módulo de Matrícula (documento oficial) define que o contrato aparece na Etapa 5:

Etapa 5 — Geração do Contrato
(Modelo → placeholders → PDF/HTML)


O sistema:

Identifica qual modelo usar (REGULAR / CURSO_LIVRE / PROJETO_ARTISTICO).

Substitui todos os placeholders.

Gera um PDF.

Armazena em contrato_pdf_url.

Registra a versão do contrato vinculada à matrícula.

Exibe para assinatura.

8. Regras de Negócio
8.1 Somente administradores podem editar modelos

Conforme Visão Geral e regras do Contexto Administrativo.


8.2 Contrato não pode ser alterado após uso

Versões antigas devem ser preservadas.

Matrículas antigas precisam manter o contrato exato que foi assinado.

8.3 Cada Plano de Matrícula pode apontar para um modelo específico

Isso garante consistência:

Ex.: Plano “Ballet Regular 2026” → contrato escolar v1.0

Ex.: Plano “Festival Regional 2026” → contrato artístico v1.0

8.4 Contrato de Projeto Artístico pode incluir termos especiais

Direito de imagem

Uso de figurino

Taxas específicas

Responsabilidade em apresentações externas

9. Template Base para Criar um Novo Contrato

Este trecho serve como padrão inicial para escrever contratos em texto-modelo:

CONTRATO DE PRESTAÇÃO DE SERVIÇOS — {{TITULO_CONTRATO}}

Pelo presente instrumento, de um lado:

CONEXÃO DANÇA, CNPJ nº {{CNPJ_ESCOLA}}, com sede em {{ENDERECO_ESCOLA}}, doravante chamada CONTRATADA;

E, de outro:

{{RESPONSAVEL_FINANCEIRO}}, CPF nº {{CPF_RESPONSAVEL_FINANCEIRO}}, responsável pelo(a) aluno(a) {{NOME_ALUNO}}, doravante chamado CONTRATANTE;

Resolvem firmar o presente Contrato de {{TIPO_CONTRATO_DESCRICAO}}, que será regido pelas cláusulas seguintes:

CLÁUSULA 1 — DO OBJETO

{{DESCRICAO_OBJETO}}

CLÁUSULA 2 — DO PROJETO/TURMA

{{DESCRICAO_PEDAGOGICA}}

CLÁUSULA 3 — DOS VALORES

{{DISCRIMINACAO_VALORES}}

CLÁUSULA 4 — DAS CONDIÇÕES DE PAGAMENTO

Multa de {{MULTA_PERCENTUAL}}% e juros de {{JUROS_DIARIO}}% ao dia…

CLÁUSULA 5 — DA RESCISÃO

{{REGRAS_CANCELAMENTO}}

CLÁUSULA 6 — DIREITO DE IMAGEM (Obrigatório em PROJETO_ARTISTICO)

Texto padrão…

CLÁUSULA 7 — VIGÊNCIA

{{DATA_INICIO}} a {{DATA_FIM}}

CLÁUSULA 8 — DISPOSIÇÕES GERAIS

…

Assinatura:
{{RESPONSAVEL_FINANCEIRO}} — {{DATA_ASSINATURA}}

10. Integração com os Outros Módulos
10.1 Matrículas

Contrato é parte essencial da matrícula.

Aparece na Etapa 5.


10.2 Planos Financeiros

Determinam os valores que serão colocados nos contratos.

10.3 Turmas

REGULAR e CURSO_LIVRE puxam dados diretamente da turma.


10.4 Projetos Artísticos

PROJETO_ARTISTICO puxa dados do projeto e das coreografias.

10.5 Financeiro

Permite cobrar as taxas definidas no contrato.

