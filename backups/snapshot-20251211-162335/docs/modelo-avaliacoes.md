📘 Modelo de Avaliações — Conexão Dança

Versão: 1.0
Última atualização: 29/11/2025
Responsável: Alírio de Jesus e Silva Filho

1. Objetivo

O módulo Avaliações tem como finalidade:

medir a proficiência técnica e artística do aluno;

confirmar sua evolução dentro do conteúdo programado;

vincular avaliações a turmas, níveis, módulos e habilidades;

gerar conceitos, não notas (sistema avaliativo não punitivo);

integrar com Currículo e Conclusão do Curso.

Avaliações são projetadas para professores criarem instrumentos coerentes com:

curso (ballet, jazz, contemporâneo etc.)

nível (iniciante, intermediário, avançado)

conteúdo ou habilidades que compõem o nível (ex.: plié, tendu, desenvoltura, musicalidade…)

2. Princípios Pedagógicos

A avaliação nunca “reprova”.
Ela classifica a proficiência do aluno.

Cada nível tem seu conteúdo oficial, e avaliações sempre se baseiam nele.
(conteúdos vêm de: /academico/habilidades, /academico/modulos, /academico/niveis)

Avaliação = instrumento, não disciplina.
O professor cria grupos de exercícios, cada grupo avalia uma parte do conteúdo.

Avaliação deve ser adaptável, pois cada professor monta a sua — mas sempre dentro do conteúdo do nível.

Avaliação pode ser:

prática (corpo)

teórica (história da dança, música, vocabulário)

desempenho (ensaio e palco)

3. Arquitetura do Módulo

O módulo é formado por 3 entidades principais:

avaliacoes_modelo
— estrutura “template” criada pelo professor

turma_avaliacoes
— vínculo entre avaliação e turma

avaliacao_aluno_resultado
— resultado individual do aluno naquela avaliação

4. Tabela: avaliacoes_modelo

(Modelo de avaliação / template criado pelo professor)

Campos:
Campo	Tipo	Descrição
id	PK	Identificador
nome	text	Nome da avaliação (“Avaliação Semestral Ballet I”)
curso	text	Ballet, Jazz, Contemporâneo…
nivel	text	Iniciante, Intermediário, Avançado
descricao	text	Objetivo pedagógico
tipo_avaliacao	enum	PRATICA, TEORICA, DESEMPENHO, MISTA
obrigatoria	boolean	Se é obrigatória para conclusão da turma
habilidades_relacionadas	text[]	Lista de habilidades/módulos desse nível
grupos	jsonb	Estrutura dos grupos (ver abaixo)
conceitos_permitidos	text[]	Ex.: ["Excelente", "Bom", "Regular", "Precisa Melhorar"]
ativo	boolean	Se está disponível para uso
5. Estrutura de Grupos (jsonb)

Um modelo de avaliação contém grupos, cada grupo corresponde a uma parte da aula.

Exemplo JSON:

{
  "grupos": [
    {
      "nome": "Aquecimento",
      "itens": [
        "Postura inicial",
        "Alinhamento",
        "Alongamento básico"
      ]
    },
    {
      "nome": "Técnica de Barra",
      "itens": [
        "Plié",
        "Tendu",
        "Rond de Jambe"
      ]
    },
    {
      "nome": "Centro",
      "itens": [
        "Equilíbrio",
        "Coordenação",
        "Giro simples"
      ]
    }
  ]
}


Os itens são associados automaticamente às habilidades cadastradas do nível.

👉 Isso garante coerência entre conteúdo e avaliação.

6. Tabela: turma_avaliacoes

(Já prevista no Modelo de Turmas v1.1.2 )

Campos:
Campo	Tipo	Descrição
id	PK	
turma_id	FK	Turma vinculada
avaliacao_modelo_id	FK	Template da avaliação
obrigatoria	boolean	Pode sobrescrever o modelo
data_prevista	date	Opcional
data_realizada	date	Opcional
Tela da Turma permite:

listar avaliações vinculadas

adicionar avaliação existente

criar avaliação nova + vincular

remover avaliação

ver resultados dos alunos

7. Tabela: avaliacao_aluno_resultado

Guarda o resultado do aluno naquela avaliação.

Campos:

Campo	Tipo	Descrição
id	PK	
pessoa_id	FK	Aluno avaliado
turma_id	FK	
avaliacao_modelo_id	FK	
conceito_final	text	Ex.: “Bom”, “Excelente”, etc.
conceitos_por_grupo	jsonb	Resultado por grupo (ver abaixo)
observacoes_professor	text	Notas do professor
data_avaliacao	date	Data da avaliação
avaliador_id	FK	Professor responsável
Exemplo conceitos_por_grupo:
{
  "Aquecimento": "Bom",
  "Barra": "Excelente",
  "Centro": "Regular"
}

8. Conceitos de Avaliação

Conceitos padronizados sugeridos:

Excelente

Bom

Regular

Precisa melhorar

(Professor pode definir mais no futuro)

Esses conceitos são exibidos:

na ficha do aluno

na tela da turma

no currículo (quando parte da conclusão final do curso)

9. Ligação com Turmas e Conclusão de Curso

Conforme Modelo de Turmas v1.1.2 :

O aluno só conclui se:

frequência >= frequencia_minima_percentual
E
todas as avaliações obrigatórias tiverem resultado registrado


Isso gera entrada no Currículo, conforme modelo:
📘 Modelo de Currículo — versão 1.0

10. Conteúdo → Avaliação (relação pedagógica)

O sistema deve permitir:

Selecionar o curso da avaliação

Selecionar o nível

Listar automaticamente:

módulos do nível

habilidades do nível

Gerar grupos automaticamente a partir dessas habilidades
ou permitir que o professor reorganize manualmente.

Isso garante que nenhuma avaliação saia do escopo pedagógico.

11. Interface sugerida para criação de avaliação
[Nome da Avaliação]
[Curso] [Nível]
[Tipo da avaliação]

[Selecionar habilidades do nível]
[Gerar grupos automaticamente]  ← opcional
[+ Adicionar grupo]
[+ Adicionar item]

[Conceitos permitidos]
[Obrigatória para conclusão do curso?]

[Salvar Modelo]

12. Fluxos do professor
Criar avaliação:

Baseada no nível

Escolher habilidades

Gerar grupos

Salvar como modelo

Vincular avaliação a turma:

Abrir Turma → Aba Avaliações

Selecionar modelo

Ajustar obrigatoriedade

Definir datas

Lançar resultado:

Abrir avaliação → lista de alunos

Registrar conceito geral

Registrar conceitos por grupo

Salvar

13. Integração com Currículo

Quando a turma é encerrada:

se avaliação é obrigatória → precisa estar registrada

resultado pode aparecer opcionalmente no currículo

Currículo só usa conceito final, não os grupos

botão “Gerar Certificado” depende do status final