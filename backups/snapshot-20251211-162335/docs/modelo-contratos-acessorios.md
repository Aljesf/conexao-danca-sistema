📘 Modelo de Contratos Acessórios — Conexão Dança

Versão: 1.0
Data: 30/11/2025
Responsável: Alírio de Jesus e Silva Filho
Status: Documento base — contratos operacionais, sociais, administrativos e de serviço
Local sugerido: docs/modelo-contratos-acessorios.md

1. Objetivo do Módulo

O módulo Contratos Acessórios serve para registrar, padronizar e emitir documentos jurídicos que não fazem parte da matrícula, mas são essenciais para a operação diária da Conexão Dança.

Esses contratos podem impactar:

Movimento Social (bolsas e ações sociais)

Financeiro (contas a pagar e a receber)

Eventos e Projetos Artísticos

Workshops e cursos livres

Prestação de serviços (professores convidados, técnicos, locações)

Termos internos (autorização, ciência, condutas, digitais, conta digital)

Eles garantem formalidade, cobertura jurídica e rastreabilidade interna (auditoria) conforme instruções do sistema .

2. Localização no Sistema (Sidebar Oficial)

Conforme o VNB — Estrutura Oficial do Sidebar:
/admin/config/contratos é o local correto para gerenciamento.


Dentro desse módulo, vamos criar duas subdivisões:

/admin/config/contratos/modelos
/admin/config/contratos/acessorios


E no futuro:

/admin/config/contratos/emitidos

3. Tipos de Contratos Acessórios

Campo sugerido: tipo_acessorio (enum)

Categoria	Subtipos
A. Contratos Sociais (Movimento Conexão Dança)	Bolsa Social • Bolsa Patrocinada • Bolsa Externa
B. Termos Internos / Operacionais	Termo Conta Digital • Termo de Assinatura Digital/Biometria • Termo de Uso de Imagem (global) • Termo de Transporte • Termo de Conduta
C. Prestação de Serviços	Professor Convidado • Artista Convidado • Técnicos (som/luz/foto) • Costureiras/figurino • Locação de espaço • Locação de equipamentos
D. Documentos Financeiros	Recibo Simples • Recibo de Prestação de Serviço • Recibo de Cachê Artístico • Declaração de Participação
E. Contratos de Parceria/Patrocínio	Empresas, hotéis, restaurantes, apoiadores
F. Contratos de Workshops / Curso Livre	Contrato com o convidado que ministra o curso
4. Tabelas Oficiais do Módulo
4.1 Tabela contratos_acessorios_modelo

Modelos de contratos (padrões, com placeholders)

Campo	Tipo	Descrição
id	PK	Identificador
tipo_acessorio	enum	Categoria (A–F)
subtipo	text	Ex: “Bolsa Social”, “Professor Convidado”
titulo	text	Nome do modelo
versao	text	Ex.: v1.0
texto_modelo	text	Conteúdo com placeholders
ativo	boolean	Somente 1 versão ativa por subtipo
requer_anexo	boolean	Ex.: figurino, documento
created_at	timestamp	
updated_at	timestamp	
observacoes	text	Uso interno
4.2 Tabela contratos_acessorios_emitidos

Registros de contratos efetivamente utilizados:

Campo	Tipo	Descrição
id	PK	Contrato emitido
modelo_id	FK	Referência ao modelo usado
pessoa_id	FK	Pessoa assinante
referencia_id	FK flexível	Pode apontar para: matrícula, projeto artístico, workshop, contas a pagar/receber
pdf_url	text	PDF final gerado
status_assinatura	enum	PENDENTE, ASSINADO, CANCELADO
created_at	timestamp	
assinatura_data	timestamp	
responsavel_assinatura_id	FK	Usuário responsável pelo envio
5. Tipologias Completas e Placeholders

A seguir, detalhamos cada grupo com placeholders — assim como é feito no documento de Contratos Acadêmicos.


A. CONTRATOS SOCIAIS (MOVIMENTO)

Ligados ao módulo Movimento Conexão Dança:
/escola/movimento/bolsas
/escola/movimento/acoes-solidarias


Subtipos:

Concessão de Bolsa Social — Conexão Dança

Concessão de Bolsa Patrocinada — Gavi Resorts

Concessão de Bolsa Externa — instituição parceira

Placeholders:

{{NOME_ALUNO}}

{{CPF_RESPONSAVEL}}

{{TIPO_BOLSA}}

{{PERCENTUAL_DESCONTO}}

{{VIGENCIA_BOLSA}}

{{CRITERIOS_MANUTENCAO}}

{{RESPONSAVEL_FINANCEIRO}}

{{ANO_LETIVO}}

Regras:

impacta o módulo de Planos de Matrícula

impacta contas_receber com desconto aplicado

registra histórico para auditoria

B. TERMOS INTERNOS / OPERACIONAIS
Subtipo 1 — Termo de Autorização para Conta Digital

Permite o aluno consumir na loja e café usando crédito do responsável.
Impacta contas_receber (crédito adiantado).


Placeholders:

{{NOME_ALUNO}}

{{NOME_RESPONSAVEL}}

{{LIMITE_CREDITO}}

{{VALIDADE}}

Subtipo 2 — Termo de Assinatura Digital/Biometria

Dá validade jurídica aos contratos assinados dentro do sistema.

Placeholders:

{{NOME_RESPONSAVEL}}

{{DATA_ASSINATURA}}

{{TIPO_ASSINATURA}} (app, biometria, token)

Subtipo 3 — Termo de Uso de Imagem (Global)

Permite imagens do aluno em:

campanhas

redes sociais

espetáculos

festivais

Esse documento pode ser anexado à matrícula, mas é geral, não exclusivo.

C. PRESTAÇÃO DE SERVIÇOS

Contratos emitidos para:

professores convidados

coreógrafos externos

artistas convidados

técnicos de som/luz

fotógrafos/videomakers

locação de espaço/equipamento

Placeholders:

{{NOME_PRESTADOR}}

{{CPF_PRESTADOR}}

{{SERVICO}}

{{VALOR_CACHÊ}}

{{DATA_EVENTO}}

{{HORARIO}}

{{RESPONSAVEL_ESCOLA}}

Impacta:

contas_pagar no módulo financeiro

eventos internos/externos do calendário

projetos artísticos (espetáculo, festival)


D. DOCUMENTOS FINANCEIROS

Esses documentos estarão dentro do módulo, mas são de natureza mais simples.

Subtipos:

Recibo Simples

Recibo de Prestação de Serviço

Recibo de Cachê Artístico

Declaração de Participação

Cada recibo deve ter:

pessoa/credor

valor

data

descrição

centro de custo (para auditoria)

PDF final

E. CONTRATOS DE PARCERIA / PATROCÍNIO

Ex.: Gavi Resorts, bares, hotéis, marcas.

Placeholders:

{{NOME_PARCEIRO}}

{{CNPJ_PARCEIRO}}

{{OBJETO_PARCEIRA}}

{{CONTRAPARTIDAS}}

{{DURACAO}}

F. CONTRATOS DE WORKSHOPS / CURSO LIVRE (COM O PROFESSOR)

Esses NÃO são os contratos da matrícula do aluno.

São contratos com quem ministra:

workshop

colônia de férias

curso especial

Eles precisam existir porque:

geralmente envolvem valor de cachê

impactam contas_pagar

devem ser vinculados ao evento/curso livre

6. Fluxo de Edição e Emissão de Contratos Acessórios
Etapa 1 — Administrador cria/edita modelo

Em /admin/config/contratos/acessorios.

Etapa 2 — Sistema permite emissão vinculada a:

pessoa

projeto artístico

evento

turma curso livre

contas a pagar/receber

Etapa 3 — Preenche placeholders
Etapa 4 — Gera PDF
Etapa 5 — Solicita assinatura (manual/digital)
Etapa 6 — Registra como emitido
Etapa 7 — Integra com financeiro (quando aplicável)
7. Estrutura Base de Texto para Contratos Acessórios

Todos seguem o padrão jurídico dos contratos acadêmicos (mesma linguagem estrutural)

com adaptações:

CONTRATO / TERMO — {{TITULO_CONTRATO}}

Identificação das partes
Objeto do contrato
Obrigações do prestador / beneficiário
Obrigações da Conexão Dança
Valores (se houver)
Forma de pagamento (contas_pagar ou desconto)
Prazo
Rescisão
Disposições gerais
Assinaturas

8. Integrações com Módulos do Sistema
8.1 Financeiro (contas a pagar / receber)

Contratos de serviço e patrocínio geram lançamentos em centros de custo.


8.2 Movimento Social

Contratos de bolsas se conectam ao cadastro de ações sociais.


8.3 Workshop / Curso Livre

Contratos com professores convidados vinculam-se às turmas tipo CURSO_LIVRE.


8.4 Projetos Artísticos

Contratos com artistas, técnicos, figurino etc. vinculam-se a projetos_artistico.
(Será detalhado no MD próprio)

8.5 Auditoria

Toda emissão deve ser registrada no módulo de auditoria, conforme instrução oficial.