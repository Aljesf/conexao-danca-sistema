> ⚠️ DOCUMENTO LEGADO  
> Este arquivo descreve regras anteriores de matrícula.  
> A fonte única de verdade é:  
> Regras Oficiais de Matrícula (Conexão Dança) – v1

📘 Modelo de Matrículas — Conexão Dança

Versão: 1.0
Data: 30/11/2025
Responsável: Alírio de Jesus e Silva Filho
Status: Documento base — integra módulos Acadêmico, Financeiro, Contratos, Pessoas e Projetos Artísticos.
No vscode o caminho é docs/modelos-de-matriculas.md

1. Objetivo do Módulo de Matrículas

O módulo de Matrículas tem como objetivo registrar oficialmente a entrada de um aluno em três tipos distintos de participação na Conexão Dança:

Matrícula Acadêmica (REGULAR)

Vínculo com turmas regulares do ano letivo.

Gera mensalidades recorrentes.

Gera contrato escolar formal.

Matrícula em Curso Livre (CURSO_LIVRE)

Workshops, intensivos, cursos de curta duração.

Gera taxa única ou pacote de parcelas.

Gera contrato específico.

Matrícula em Projeto Artístico (PROJETO_ARTISTICO)

Espetáculos, festivais, mostras, apresentações especiais.

Integra com coreografias e ensaios.

Gera taxa(s) específicas (participação, figurino, etc.)

Gera contrato de participação artística.

Cada matrícula vincula:

Pessoa → Aluno

Responsável financeiro

Uma unidade pedagógica
(Turma regular, curso livre ou projeto artístico)

Um plano financeiro

Um contrato gerado a partir de modelo

Cobranças automáticas no financeiro

2. Tipos de Matrícula

Campo: tipo_matricula (enum)

Valor	Descrição
REGULAR	Matrícula acadêmica em turma regular (ano letivo).
CURSO_LIVRE	Matrícula em workshop, intensivo, curso fechado.
PROJETO_ARTISTICO	Matrícula para participação em espetáculo/festival/mostra.
3. Fluxo Padronizado de Matrícula (Wizard 6 etapas)

A matrícula segue um fluxo universal, independente do tipo.
Cada etapa habilita dados específicos conforme o tipo_matricula.

Etapa 1 — Identificação do Aluno e Responsáveis

Selecionar pessoa existente (pessoas) ou criar nova.

Caso ainda não seja aluno, criar registro na tabela alunos.

Selecionar/registrar:

responsáveis legais,

responsável financeiro,

contatos (principal e emergência).

Regras:

Responsável financeiro é obrigatório para todos os tipos.

Responsável financeiro deve estar em pessoas (CPF/CNPJ).

Etapa 2 — Escolha do Tipo de Matrícula e Vínculo Pedagógico

Aqui se define o “destino” da matrícula:

Para REGULAR

Selecionar Turma Regular (tipo_turma = REGULAR).

Associar ao período letivo se necessário.

Para CURSO_LIVRE

Selecionar Turma do tipo CURSO_LIVRE
(workshop, colônia, intensivo).

Para PROJETO_ARTISTICO

Selecionar Projeto Artístico
(espetáculo, festival, mostra, apresentação especial).

Resultado desta etapa → preenche campo vinculo_id.

Etapa 3 — Ficha de Cuidados do Aluno

A ficha de cuidados é parte obrigatória do processo.
(Documento oficial separado, versão 1.0)

Campos principais:

saúde / histórico físico

alergias

alimentação

autorização de saída

medidas (calçados, collant, roupas)

observações pedagógicas

Regras:

Pode ser anexada e preenchida automaticamente em matrículas futuras.

Professores visualizam em turmas e projetos.

Etapa 4 — Seleção do Plano Financeiro

O plano define valores, taxas, multa, juros e parcelas.

Para todos os tipos, selecionar:

Plano de Matrícula (definido previamente no módulo de Planos).

Aplicar:

bolsa/desconto

observações de negociação (opcional)

REGULAR

Plano com mensalidade recorrente

Taxa de matrícula (opcional)

CURSO_LIVRE

Plano com taxa única

Ou plano parcelado (3x, 5x etc.)

PROJETO_ARTISTICO

Plano com taxas específicas:

participação

figurino

pacote completo

video/foto (opcional)

Etapa 5 — Geração do Contrato

O sistema junta:

Modelo de contrato (contratos_modelo)

Variáveis da matrícula (placeholders)

Dados do aluno e responsáveis

Dados financeiros do plano

Dados pedagógicos (turma ou projeto)

E gera:

contrato_pdf_url

contrato_html_preview (para assinatura)

O contrato depende do tipo da matrícula:

REGULAR → Contrato escolar

CURSO_LIVRE → Contrato de participação em curso livre

PROJETO_ARTISTICO → Contrato de participação artística

Etapa 6 — Geração Automática das Cobranças

Após concluir matrícula:

Criar registro em matriculas

Criar cobranças em:

contas_receber

vinculadas ao centro de custo e categoria do plano financeiro.

Configurar recorrência (para REGULAR).

Registrar:

primeira parcela

taxa de matrícula ou inscrição

valores extras (se houver)

Regras automáticas:

Cancelamento de matrícula gera cancelamento ou renegociação das cobranças abertas.

Trancamento pausa recorrência, mas mantém histórico.

4. Modelagem da Tabela matriculas (conceitual)
Campo	Tipo	Descrição
id	PK	Identificador
pessoa_id	FK → pessoas	Dono da matrícula
responsavel_financeiro_id	FK → pessoas	Obrigatório
tipo_matricula	enum	REGULAR, CURSO_LIVRE, PROJETO_ARTISTICO
vinculo_id	FK	turma_id ou projeto_artistico_id
plano_matricula_id	FK	Plano financeiro selecionado
contrato_modelo_id	FK	Modelo utilizado
contrato_pdf_url	text	Arquivo final assinado
status	enum	ATIVA, TRANCADA, CANCELADA, CONCLUIDA
ano_referencia	int	Para REGULAR
data_matricula	date	Criação
data_encerramento	date	Para conclusão/trancamento
observacoes	text	Interno
5. Integrações Importantes
5.1 Com Turmas

Usa vinculo_id para REGULAR e CURSO_LIVRE.
Turmas são definidas no documento oficial de turmas.

5.2 Com Projetos Artísticos

vinculo_id aponta para projetos_artistico.

5.3 Com Contratos

Cada matrícula gera um contrato baseado no modelo.

5.4 Com Financeiro

Gera automaticamente cobrança no contas_receber conforme modelo financeiro.

5.5 Com Currículo

Conclusão de turmas REGULARES e CURSO_LIVRE alimenta histórico acadêmico.

5.6 Com Ficha de Cuidados

Dados persistem e acompanham o aluno em cada matrícula.

6. Regras Especiais
REGULAR

Só é permitida 1 matrícula regular por turma.

Conclusão depende de frequência e avaliações.

CURSO_LIVRE

Pode coexistir com matrícula regular.

Só gera histórico quando terminar.

PROJETO_ARTISTICO

Pode ter várias matrículas no mesmo ano.

Aluno pode participar de mais de um projeto.

Ensaios e coreografias não são “matrículas”; são desdobramentos internos.

7. Localização da Matrícula no Sistema

Conforme estrutura oficial da Sidebar:

Contexto Escola → Alunos

/escola/alunos/matriculas

/escola/alunos/novo (atalho que inicia matrícula regular)

/escola/projetos (para projetos artísticos)

Contexto Configuração / Admin

/config/contratos

/config/financeiro/planos-matricula

8. Futuras Expansões (previstas)

Assinatura digital integrada (ZapSign, Autentique, Clicksign).

Recorrência automática de cobrança via PIX/Cartão.

Autoencerramento de turmas e retroalimentação do currículo.

Painel de controle de inadimplência por matrícula.

Migração de turma sem cancelar matrícula antiga.