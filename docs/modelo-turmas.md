📘 Modelo de Turmas — Conexão Dança

Versão: 1.3
Última atualização: 28/11/2025
Responsável: Alírio de Jesus e Silva Filho

1. Objetivo

Este documento define a estrutura oficial das Turmas dentro do Sistema Conexão Dança.

Cada turma pode ser:

Turma regular (ano letivo / aulas contínuas)

Curso livre (workshops, cursos de curta duração, colônias de férias)

Turma de ensaio (ensaios para espetáculos, coreografias, apresentações)

Todas elas vivem na mesma tabela turmas, diferenciadas pelo campo tipo_turma.

2. Tipos de Turma

Campo tipo_turma (enum):

🟣 REGULAR
Aulas regulares dentro do ano letivo (base para matrículas e mensalidades).

🔵 CURSO_LIVRE
Cursos intensivos, workshops, colônias de férias, cursos fechados de 1 dia ou mais.

🟡 ENSAIO
Ensaios ligados a espetáculo/coreografia.

3. Estrutura da Tabela turmas
3.1. Campos comuns (todos os tipos)
Campo	Tipo	Descrição
id / turma_id	PK	Identificador da turma
tipo_turma	enum	REGULAR, CURSO_LIVRE, ENSAIO
nome	text	Nome exibido da turma
curso	text	Ex.: “Ballet”, “Jazz”, “Hip-Hop”
nivel	text	Ex.: “Iniciante”, “Intermediário”, “Avançado”
turno	enum	MANHA, TARDE, NOITE, INTEGRAL
ano_referencia	integer	Ex.: 2026
dias_semana	text[]	Ex.: ["Segunda","Quarta"], ["Domingo"]
hora_inicio	time	Hora de início (padrão / resumo)
hora_fim	time	Hora de fim (padrão / resumo)
capacidade	integer	Limite de alunos
professor_id	FK	Professor responsável atual (opcional, ver seção 10)
data_inicio	date	Data real de início
data_fim	date	Data real de encerramento
status	enum	EM_PREPARACAO, ATIVA, ENCERRADA, CANCELADA
encerramento_automatico	boolean	Encerrar sozinho ao passar de data_fim
periodo_letivo_id	FK	Período letivo (opcional)
carga_horaria_prevista	numeric	Horas ou nº de aulas previstas
frequencia_minima_percentual	numeric	Ex.: 75
observacoes	text	Campo livre

Observação: dias_semana, hora_inicio e hora_fim servem como resumo.
A modelagem detalhada de horários por dia pode ser feita em uma tabela auxiliar (turma_horarios) a ser definida em versão futura.

4. Campos Específicos por Tipo de Turma
4.1. Turma REGULAR

Usos:

Aulas recorrentes durante todo o ano letivo

Presença alimenta currículo e avaliação interna

Recebe matrículas contínuas

Regras:

Deve apontar para periodo_letivo_id

data_inicio e data_fim dentro ou próximas do período letivo

Pode ter avaliações obrigatórias (ver seção 9)

Nome sugerido:

{curso} {nivel} – {turno} {ano_referencia}
Ex.: Ballet Iniciante – Manhã 2026

4.2. Turma de Curso Livre (CURSO_LIVRE)

Abrange:

Workshops

Cursos pontuais

Colônias de férias

Intensivos

Campos adicionais (conceituais):

Campo	Tipo	Descrição
evento_id	FK	Evento/festival, se fizer parte
convidado_nome	text	Professor convidado externo
local	text	Local diferente da escola (quando houver)
vagas_externas	int	Vagas para público externo (opcional)

Regras:

data_inicio e data_fim delimitam o curso

Deve ter frequencia_minima_percentual (se aplicável)

Pode ter avaliações obrigatórias

Conclusão gera registro no currículo interno

4.3. Turma de Ensaio (ENSAIO)

Abrange:

Ensaios para espetáculo (interno/externo)

Ensaios de coreografias específicas

Ensaios gerais/parciais

Tabelas auxiliares (conceito):

eventos_artistico

coreografias

Campos adicionais (conceituais):

Campo	Tipo
evento_id	FK
coreografia_id	FK
descricao_ensaio	text

Regras:

Pode ser criada “uma turma por dia de ensaio”

Pode ser ligada a espetáculo (ex.: Fijan 2026)

Pode registrar presença

Normalmente não gera currículo

5. Encerramento das Turmas
5.1. Encerramento Automático

Se encerramento_automatico = true e a data atual passou de data_fim:

Sistema exibe:

“A turma X atingiu a data de término. Deseja encerrar?”

Se confirmado → status = ENCERRADA

5.2. Encerramento Manual

Botão “Encerrar Turma” na página de detalhes/edição.

6. Conclusão do Aluno + Currículo

Aplicável a:

REGULAR

CURSO_LIVRE

6.1. Parte de Frequência

Ao encerrar a turma:

total_aulas      = número de registros de presença
aulas_presentes  = presenças do aluno
frequencia(%)    = (aulas_presentes / total_aulas) * 100


Comparar com frequencia_minima_percentual.

6.2. Parte de Avaliações

Se houver avaliações obrigatórias (ver seção 9):

O aluno só conclui se:

frequencia >= frequencia_minima_percentual e

todas as avaliações obrigatórias estiverem concluídas/aprovadas.

Esse resultado é gravado em historico_academico
e aparece na tela Currículo (não há rota própria de certificados).

7. Nome e Identidade da Turma

Campos base: curso, nivel, turno, ano_referencia.

Turno sugerido automaticamente:

< 12h → manhã

12h–18h → tarde

18h → noite

O nome pode ser sugerido automaticamente e ainda editado manualmente.

8. Integração Futura

As turmas se integram com:

Matrículas

REGULAR → mensalidade contínua

CURSO_LIVRE → curso fechado

Calendário

período letivo

agenda de feriados

ensaios e eventos

Currículo

conclusão interna → historico_academico

botão “Gerar certificado” na linha do currículo

9. Integração com Avaliações

A Turma pode ter diversas avaliações ligadas a ela, via tabela de vínculo:

9.1. Tabela turma_avaliacoes
Campo	Tipo	Descrição
id	PK	
turma_id	FK	Qual turma
avaliacao_modelo_id	FK	Tipo/modelo de avaliação
obrigatoria	bool	Se é exigida para conclusão
data_prevista	date	Opcional
data_realizada	date	Opcional
9.2. Tipos de Avaliação (conceito)

Avaliação prática

Avaliação teórica

Avaliação de desempenho

Exames internos

9.3. Efeito na conclusão

Ao encerrar turma REGULAR ou CURSO_LIVRE:

Frequência mínima deve ser cumprida

Todas as avaliações obrigatórias devem estar concluídas/aprovadas

Caso contrário, o aluno recebe status de NAO_CONCLUIDO ou TRANCADO.

9.4. Tela da Turma deve permitir

Ver lista de avaliações vinculadas

Adicionar avaliação existente

Criar avaliação nova e já vincular

Remover avaliação da turma

10. Integração com Professores e Colaboradores (NOVIDADE v1.3)

A turma pode ter vários professores/estagiários ao longo do tempo, e essa relação deve:

usar apenas colaboradores com funções que “Podem lecionar” (grupo PROFESSOR, Estagiário de dança etc.);

permitir marcar um professor principal em determinado período;

manter histórico de entradas/saídas de professores.

10.1. Tabela turma_professores (vínculo Turma ↔ Professor)

Nova tabela (conceito):

Campo	Tipo	Descrição
id	PK	
turma_id	FK	Turma à qual o professor está vinculado
colaborador_id	FK	Colaborador (pessoa com função que pode lecionar)
funcao_id	FK	Tipo de função exercida (professor residente, coach, estagiário…)
principal	bool	Indica se é/era o professor principal da turma
data_inicio	date	Data em que começou a lecionar naquela turma
data_fim	date	Data em que deixou a turma (NULL = atual)
ativo	bool	Ativo/inativo
observacoes	text	Observações específicas do vínculo
10.2. Relação com turmas.professor_id

turmas.professor_id pode ser usado como atalho para o professor principal atual.

Esse valor deve sempre apontar para o colaborador_id que está em turma_professores com:

principal = true

data_fim IS NULL

Em caso de troca de professor:

Atualizar turma_professores (fechar o vínculo antigo com data_fim, criar novo com data_inicio);

Atualizar turmas.professor_id para o novo professor principal.

10.3. Comportamento esperado na interface

Na tela de edição da Turma:

Seção “Professores da turma” com:

Lista de vínculos atuais (professor, função, desde quando, se é principal);

Botão “Adicionar professor/estagiário à turma”, filtrando apenas colaboradores com função que “pode lecionar”;

Botão para marcar/desmarcar “professor principal”;

Botão para “Encerrar vínculo” (preenchendo data_fim e ativo = false).

Seção de histórico:

Lista somente leitura com todos que já passaram pela turma (nome, função, período).

Essa modelagem garante:

várias pessoas lecionando a mesma turma (professor + estagiário, professor convidado, etc.);

histórico completo de quem passou por aquela turma;

possibilidade de relatórios futuros (ex.: “em quais anos o professor X deu qual turma”).