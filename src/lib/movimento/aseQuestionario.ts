export type AseContexto = "ASE_18_PLUS" | "ASE_MENOR";

export type AseAutor = "RESPONSAVEL" | "ALUNO" | "ALUNO_18" | "COLABORADOR";

export type AseObrigatoriedade = "OBR" | "REC" | "OPC" | "NA";

export type AsePerguntaTipo = "TEXTO" | "OPCOES" | "MULTI_CHECK";

export type AsePergunta = {
  id: string;
  bloco: string;
  pergunta: string;
  autor: AseAutor;
  tipo: AsePerguntaTipo;
  opcoes?: string[];
  obrigatoriedade: {
    ASE_18_PLUS: AseObrigatoriedade;
    ASE_MENOR: AseObrigatoriedade;
  };
  condicional?: {
    dependeDeId: string;
    valoresQueAtivam: string[];
  };
};

export const ASE_PERGUNTAS: AsePergunta[] = [
  { id: "R1", bloco: "R", pergunta: "Ha quanto tempo seu filho(a) participa do Conexao Danca / Movimento Conexao Danca?", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["menos de 1 ano","entre 1 e 2 anos","mais de 2 anos"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R2", bloco: "R", pergunta: "Na sua percepcao, o que mais marcou a experiencia do seu filho(a) no Conexao Danca ate agora?", autor: "RESPONSAVEL", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R3", bloco: "R", pergunta: "Considerando a rotina atual da familia, voce acredita que e possivel manter a frequencia e o compromisso com as atividades do Conexao Danca?", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["sim","com algum esforco","estamos reorganizando nossa rotina"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R4", bloco: "R", pergunta: "Quando surgem duvidas ou dificuldades, voce sente que o Conexao Danca esta disponivel para dialogar com a familia?", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["sim","parcialmente","ainda podemos melhorar esse dialogo"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R5", bloco: "R", pergunta: "No momento atual, voce considera que seu filho(a) necessita de apoio institucional para permanecer no Conexao Danca?", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["sim","parcialmente","nao"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R6", bloco: "R", pergunta: "Para fins de analise institucional e relatorios de impacto, indique a faixa aproximada de renda familiar.", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["ate 1 SM","1-2 SM","2-3 SM","acima de 3 SM"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R7", bloco: "R", pergunta: "Principal fonte de renda da familia.", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["emprego formal","trabalho informal","autonomo","beneficio governamental","outra"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R8", bloco: "R", pergunta: "No momento atual, a familia possui condicoes financeiras de arcar integralmente com o valor da mensalidade do Conexao Danca?", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["sim","parcialmente","nao"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R9", bloco: "R", pergunta: "Caso a resposta seja parcialmente ou nao, a familia declara que necessita de apoio institucional para viabilizar a permanencia do aluno(a)?", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["sim","nao"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" }, condicional: { dependeDeId: "R8", valoresQueAtivam: ["parcialmente","nao"] } },
  { id: "R10", bloco: "R", pergunta: "Para fins estatisticos, o responsavel se identifica como:", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["preta","parda","branca","amarela","indigena","prefiro nao declarar"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "REC" } },
  { id: "R11", bloco: "R", pergunta: "O que faz sua familia continuar caminhando com o Conexao Danca?", autor: "RESPONSAVEL", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R12", bloco: "R", pergunta: "De que forma voce acredita que essa relacao entre sua familia e o Movimento pode continuar sendo uma parceria positiva?", autor: "RESPONSAVEL", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R13", bloco: "R", pergunta: "A familia compreende que a permanencia do aluno depende tambem de compromisso com frequencia, disciplina e dialogo com a escola?", autor: "RESPONSAVEL", tipo: "OPCOES", opcoes: ["sim","nao"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R14", bloco: "R", pergunta: "De que forma a familia se compromete a colaborar com o processo formativo do aluno(a)?", autor: "RESPONSAVEL", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R15", bloco: "R", pergunta: "Ciencia institucional (responsavel) - marcar:", autor: "RESPONSAVEL", tipo: "MULTI_CHECK", opcoes: [
    "compreendo que o apoio institucional segue criterios responsaveis e revisaveis",
    "reconheco a importancia do compromisso familiar na permanencia do aluno",
    "concordo em seguir caminhando em parceria com o Conexao Danca"
  ], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "R16", bloco: "R", pergunta: "Declaracao final e autorizacao de uso institucional (informacoes verdadeiras; ciencia de revisibilidade; autorizacao de uso institucional consolidado).", autor: "RESPONSAVEL", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },

  { id: "A1", bloco: "A", pergunta: "O que voce mais gosta no Conexao Danca?", autor: "ALUNO", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "A2", bloco: "A", pergunta: "Como voce se sente quando esta no Conexao Danca?", autor: "ALUNO", tipo: "OPCOES", opcoes: ["muito feliz","bem","ainda me adaptando"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "A3", bloco: "A", pergunta: "Para voce, a danca hoje e mais:", autor: "ALUNO", tipo: "OPCOES", opcoes: ["um aprendizado","uma forma de se expressar","algo que quero levar para o futuro","um lugar onde me sinto bem"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "A4", bloco: "A", pergunta: "Voce gosta de participar das aulas e atividades?", autor: "ALUNO", tipo: "OPCOES", opcoes: ["sim","mais ou menos","ainda estou me acostumando"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "REC" } },
  { id: "A5", bloco: "A", pergunta: "Voce gostaria de continuar fazendo parte do Conexao Danca?", autor: "ALUNO", tipo: "OPCOES", opcoes: ["sim","sim, mas preciso me organizar melhor","ainda estou pensando"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "A6", bloco: "A", pergunta: "Voce se compromete a cuidar do espaco, respeitar colegas e professores e dar o seu melhor nas aulas?", autor: "ALUNO", tipo: "OPCOES", opcoes: ["sim","vou tentar sempre"], obrigatoriedade: { ASE_18_PLUS: "NA", ASE_MENOR: "OBR" } },
  { id: "A7", bloco: "A", pergunta: "Observacao institucional/entrevista mediada do aluno (quando aplicada)", autor: "COLABORADOR", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "OPC", ASE_MENOR: "OPC" } },

  { id: "M1", bloco: "M", pergunta: "Sua principal ocupacao hoje e:", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["estudo","trabalho","estudo e trabalho","outro momento de transicao"], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M2", bloco: "M", pergunta: "Renda mensal aproximada", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["ate 1 SM","1-2 SM","2-3 SM","acima de 3 SM"], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M3", bloco: "M", pergunta: "Voce possui condicoes financeiras de arcar integralmente com a mensalidade?", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["sim","parcialmente","nao"], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M4", bloco: "M", pergunta: "Caso nao possua, declara necessidade de apoio institucional?", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["sim","nao"], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" }, condicional: { dependeDeId: "M3", valoresQueAtivam: ["parcialmente","nao"] } },
  { id: "M5", bloco: "M", pergunta: "Ha quanto tempo voce participa do Conexao Danca?", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["menos de 1 ano","mais de 1 ano"], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M6", bloco: "M", pergunta: "O que mais marcou sua trajetoria no Conexao Danca ate agora?", autor: "ALUNO_18", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M7", bloco: "M", pergunta: "O que o Conexao Danca representa hoje para voce?", autor: "ALUNO_18", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M8", bloco: "M", pergunta: "Voce sente que consegue manter frequencia e compromisso com as atividades neste momento?", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["sim","com algum esforco","estou reorganizando minha rotina"], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M9", bloco: "M", pergunta: "No momento atual, voce considera que necessita de apoio institucional para permanecer?", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["sim","parcialmente","nao"], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M10", bloco: "M", pergunta: "Se desejar, voce se identifica como:", autor: "ALUNO_18", tipo: "OPCOES", opcoes: ["preta","parda","branca","amarela","indigena","prefiro nao responder"], obrigatoriedade: { ASE_18_PLUS: "REC", ASE_MENOR: "NA" } },
  { id: "M11", bloco: "M", pergunta: "O que faz voce continuar caminhando com o Conexao Danca?", autor: "ALUNO_18", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M12", bloco: "M", pergunta: "De que forma voce acredita que essa relacao pode continuar sendo uma parceria positiva para voce e para o Movimento?", autor: "ALUNO_18", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M13", bloco: "M", pergunta: "Ciencia institucional (18+) - marcar:", autor: "ALUNO_18", tipo: "MULTI_CHECK", opcoes: [
    "compreendo que o apoio institucional segue criterios responsaveis e revisaveis",
    "reconheco meu compromisso com frequencia, conduta e responsabilidade",
    "concordo em seguir caminhando em parceria com o Conexao Danca"
  ], obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
  { id: "M14", bloco: "M", pergunta: "Declaracao final (18+) e assinatura quando impresso", autor: "ALUNO_18", tipo: "TEXTO", obrigatoriedade: { ASE_18_PLUS: "OBR", ASE_MENOR: "NA" } },
];

export function filtrarPerguntasPorContexto(contexto: AseContexto): AsePergunta[] {
  return ASE_PERGUNTAS.filter((p) => p.obrigatoriedade[contexto] !== "NA");
}
