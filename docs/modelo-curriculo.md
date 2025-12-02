📘 Modelo de Currículo — Conexão Dança

Versão: 1.0
Última atualização: 28/11/2025
Responsável: Alírio de Jesus e Silva Filho

1. Objetivo

O módulo Currículo tem como objetivo registrar, organizar e apresentar a formação artística e acadêmica de qualquer pessoa da Conexão Dança — incluindo:

alunos

professores (que também são alunos)

bolsistas

integrantes da companhia

participantes de projetos e eventos

O currículo é composto por três blocos:

Formações internas — geradas automaticamente a partir das turmas concluídas.

Formações externas — adicionadas manualmente pelo administrador.

Experiências artísticas — histórico de espetáculos, coreografias, atuações e participações relevantes.

Todo o currículo pertence sempre a uma pessoa, nunca exclusivamente a um aluno.

2. Fontes de Informação do Currículo

O currículo é formado a partir de três tabelas principais:

historico_academico → formações internas (automáticas)

curriculo_formacoes_externas → formações externas (manuais)

curriculo_experiencias → experiências artísticas (manuais)

E utiliza dados auxiliares de:

pessoas (dados básicos)

alunos / professores

turmas (para alimentar histórico interno)

avaliacoes (quando aplicável)

frequencia (presenças)

3. Estrutura do Currículo na Interface

A tela do Currículo apresenta:

╔══════════════════════════════════════╗
║ Foto, Nome completo, Idade, Função   ║
╚══════════════════════════════════════╝

[ ABA 1 ] Conexão Dança (Interno)
[ ABA 2 ] Formações externas
[ ABA 3 ] Experiências artísticas
---------------------------------------
[ BOTÃO ] Exportar currículo em Markdown


O botão Gerar Certificado aparece somente na Aba Interna e apenas para:

cursos concluídos (REGULAR ou CURSO_LIVRE)

que possuem certificação habilitada

4. Aba 1 — Formações Internas (automático)
4.1 Fonte: historico_academico

A cada turma REGULAR ou CURSO_LIVRE encerrada, o sistema cria/atualiza um registro com:

Campo	Descrição
id	PK
pessoa_id	Pessoa dona do currículo
turma_id	Turma concluída
curso	Ex.: Ballet, Jazz, Hip-Hop
nivel	Nível da turma
tipo_turma	REGULAR ou CURSO_LIVRE
carga_horaria	Prevista ou calculada
frequencia_percentual	% registrada
status_conclusao	CONCLUIDO / NAO_CONCLUIDO / TRANCADO
data_conclusao	Data do encerramento
avaliacoes_concluidas	Resultado opcional (se houver avaliações obrigatórias)
observacoes	Campo livre
4.2 Como aparece na tela

Agrupar por:

Ano

Tipo (Regular / Curso Livre)

Cada item exibe:

Nome do curso / turma

Nível

Período (data início → data fim)

Carga horária

Frequência

Status (Concluído / Não Concluído / Trancado)

✔ Botão Gerar Certificado (quando aplicável)

5. Aba 2 — Formações Externas (manual)
5.1 Nova tabela: curriculo_formacoes_externas

Campos:

Campo	Descrição
id	PK
pessoa_id	FK
tipo_formacao	CURSO / WORKSHOP / FESTIVAL / CERTIFICACAO / OUTRO
instituicao	Escola, evento, festival
nome_formacao	Nome do curso
carga_horaria	Opcional
cidade_pais	Opcional
data_inicio	Opcional
data_fim	Opcional
certificado_existe	bool
certificado_arquivo	ID de arquivo (futuro)
observacoes	Texto livre
5.2 Na interface

Botão “Adicionar formação externa”

Lista com edição e remoção

Pode anexar certificado externo (upload opcional)

6. Aba 3 — Experiências Artísticas (manual)
6.1 Nova tabela: curriculo_experiencias

Campos:

Campo	Descrição
id	PK
pessoa_id	FK
tipo	ESPETACULO / APRESENTACAO / COREOGRAFIA / PROJETO / OUTRO
nome_evento	Nome do espetáculo/evento
papel	Papel desempenhado (bailarino, solista, personagem X)
descricao	Texto livre
data_evento	Data
local	Cidade/Local
arquivo_midia_id	foto ou vídeo opcional
6.2 Na interface

Botão “Adicionar experiência artística”

Lista detalhada com:

nome, tipo, papel, ano

anexo de foto/vídeo (futuro)

7. Exportar Currículo em Markdown

Botão na parte inferior:

Exportar currículo em Markdown


O arquivo MD gerado conterá:

Dados pessoais (nome, idade, função na escola)

Formações internas

Formações externas

Experiências artísticas

Contatos e links (versão futura)

O objetivo é permitir que você:

copie e cole no ChatGPT

peça para gerar:

biografia

mini-bio

apresentação artística

perfil para espetáculos

textos institucionais

8. Certificados

O botão Gerar Certificado aparece apenas:

em formações internas

quando status_conclusao = CONCLUIDO

quando a turma tem certificação habilitada

Certificados não aparecem no sidebar, apenas dentro da aba Currículo.

9. Regras de Conclusão (ligação com turmas)

Uma formação interna só é gerada quando:

A turma foi encerrada, e

O aluno possui:

Frequência ≥ frequencia_minima_percentual

Avaliações obrigatórias concluídas/aprovadas (se houver)

Status não é TRANCADO

Essas regras são definidas no documento:

📘 Modelo de Turmas — Conexão Dança v1.1.2


10. Localização do Currículo no Sistema

O Currículo aparece:

Dentro da ficha de qualquer pessoa

Diretamente no menu lateral do contexto escola:
→ /escola/alunos/curriculo ← conforme VNB


Pode existir também no contexto de Professores futuramente