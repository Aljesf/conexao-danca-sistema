# Relatório — Busca Curso Livre/Workshop/Evento/Serviço

Gerado em: 2025-12-24T10:19:52-03:00

## DOCS (sem backups)

docs/adr/ADR-0008-matriculas-referenciam-servico.md:1:???# ADR-0008 - Matriculas referenciam Servico (e nao apenas Turma)
docs/adr/ADR-0008-matriculas-referenciam-servico.md:8:- inscricao em espetaculo / eventos
docs/adr/ADR-0008-matriculas-referenciam-servico.md:13:Introduzir a entidade "Servico" como alvo universal de uma matricula.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:15:- Matricula passa a referenciar um `servico_id` (ou equivalente).
docs/adr/ADR-0008-matriculas-referenciam-servico.md:16:- Turma/Eventos/Cursos Livres geram automaticamente um Servico quando forem publicados/ativados.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:21:- Permitir relatorios consistentes por tipo de servico.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:25:- Precificacao migra de `matricula_precos_turma` para `precos_servico` (ou tabela paralela).
docs/adr/ADR-0008-matriculas-referenciam-servico.md:26:- API operacional de matricula passa a validar preco por servico.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:27:- UI do wizard escolhe Servico; se o servico exigir turma, escolhe turma em seguida.
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:81:- [PLACEHOLDER] /calendario/eventos-externos - src/app/(private)/calendario/eventos-externos/page.tsx (contexto: outros, linhas: 4)
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:82:- [PLACEHOLDER] /calendario/eventos-internos - src/app/(private)/calendario/eventos-internos/page.tsx (contexto: outros, linhas: 4)
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:202:  - /calendario/eventos-externos (4 linhas) - src/app/(private)/calendario/eventos-externos/page.tsx
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:203:  - /calendario/eventos-internos (4 linhas) - src/app/(private)/calendario/eventos-internos/page.tsx
docs/estado-rotas/estado-atual-rotas-geral.md:83:- [PLACEHOLDER] /calendario/eventos-externos - src/app/(private)/calendario/eventos-externos/page.tsx (linhas: 4)
docs/estado-rotas/estado-atual-rotas-geral.md:84:- [PLACEHOLDER] /calendario/eventos-internos - src/app/(private)/calendario/eventos-internos/page.tsx (linhas: 4)
docs/financeiro/dashboard-inteligente-help.md:22:- Qualidade de receita por produto/servi??o (mix e depend??ncia de SKU).

## RAIZ DO REPO (MD/TXT, sem backups)

docs/adr/ADR-0008-matriculas-referenciam-servico.md:1:???# ADR-0008 - Matriculas referenciam Servico (e nao apenas Turma)
docs/adr/ADR-0008-matriculas-referenciam-servico.md:8:- inscricao em espetaculo / eventos
docs/adr/ADR-0008-matriculas-referenciam-servico.md:13:Introduzir a entidade "Servico" como alvo universal de uma matricula.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:15:- Matricula passa a referenciar um `servico_id` (ou equivalente).
docs/adr/ADR-0008-matriculas-referenciam-servico.md:16:- Turma/Eventos/Cursos Livres geram automaticamente um Servico quando forem publicados/ativados.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:21:- Permitir relatorios consistentes por tipo de servico.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:25:- Precificacao migra de `matricula_precos_turma` para `precos_servico` (ou tabela paralela).
docs/adr/ADR-0008-matriculas-referenciam-servico.md:26:- API operacional de matricula passa a validar preco por servico.
docs/adr/ADR-0008-matriculas-referenciam-servico.md:27:- UI do wizard escolhe Servico; se o servico exigir turma, escolhe turma em seguida.
docs/api-matriculas.md:20:  - `vinculo_id` apontando para `turmas.turma_id` (no caso de REGULAR/CURSO_LIVRE).
docs/api-matriculas.md:80:| tipo_matricula            | string           | ??????          | Deve ser um dos valores: `REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO`. Na Fase 1, foco em REGULAR e CURSO_LIVRE.                                     |
docs/api-matriculas.md:81:| vinculo_id                | integer          | ??????          | Para REGULAR/CURSO_LIVRE: `turmas.turma_id` da turma em que o aluno ser?? matriculado. No futuro, tamb??m poder?? ser id de projeto art??stico.           |
docs/api-matriculas.md:352:- Suportar outros tipos de matr??cula (`PROJETO_ARTISTICO`) onde `vinculo_id` aponte para projetos/eventos em vez de turmas regulares.
docs/credito-conexao-v1.0.md:68:- servicos da escola
docs/estado-atual-banco.md:744:- inscricao_estadual: text
docs/estado-atual-matriculas.md:192:- `tipo_turma text CHECK (REGULAR|CURSO_LIVRE|ENSAIO)`  
docs/estado-atual-matriculas.md:202:- Para matr??culas do tipo **REGULAR** e **CURSO_LIVRE**, a turma ser?? o principal destino pedag??gico.  
docs/estado-atual-matriculas.md:352:   - `tipo_matricula` (REGULAR/CURSO_LIVRE/PROJETO_ARTISTICO)  
docs/estado-atual-sidebar-config.md:26:   - `/calendario/eventos-internos` ??? ??cone: `??` ??? label: `Eventos internos`  
docs/estado-atual-sidebar-config.md:27:   - `/calendario/eventos-externos` ??? ??cone: `??` ??? label: `Eventos externos`  
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:81:- [PLACEHOLDER] /calendario/eventos-externos - src/app/(private)/calendario/eventos-externos/page.tsx (contexto: outros, linhas: 4)
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:82:- [PLACEHOLDER] /calendario/eventos-internos - src/app/(private)/calendario/eventos-internos/page.tsx (contexto: outros, linhas: 4)
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:202:  - /calendario/eventos-externos (4 linhas) - src/app/(private)/calendario/eventos-externos/page.tsx
docs/estado-rotas/RELATORIO-DIAGNOSTICO-ROTAS.md:203:  - /calendario/eventos-internos (4 linhas) - src/app/(private)/calendario/eventos-internos/page.tsx
docs/estado-rotas/estado-atual-rotas-geral.md:83:- [PLACEHOLDER] /calendario/eventos-externos - src/app/(private)/calendario/eventos-externos/page.tsx (linhas: 4)
docs/estado-rotas/estado-atual-rotas-geral.md:84:- [PLACEHOLDER] /calendario/eventos-internos - src/app/(private)/calendario/eventos-internos/page.tsx (linhas: 4)
docs/estoque-ajuste-manual.md:21:- Ajuste manual n??o ?? corre????o livre. ?? um evento real (extravio, avaria, invent??rio, etc.).
docs/estrutura-sidebar-vnb.md:31:Eventos internos ???????? /escola/calendario/eventos-internos
docs/estrutura-sidebar-vnb.md:33:Eventos externos ???????? /escola/calendario/eventos-externos
docs/financeiro/dashboard-inteligente-help.md:22:- Qualidade de receita por produto/servi??o (mix e depend??ncia de SKU).
docs/ia-economia-tokens.md:308:(muito abaixo de qualquer servi??o contratado de TI)
docs/manual-financeiro-uso.md:37:- Escola: mensalidade, workshop, espet??culo  
docs/manual-financeiro-uso.md:86:- workshops  
docs/manual-financeiro-uso.md:87:- eventos  
docs/manual-financeiro-uso.md:95:- origem (mensalidade, workshop, loja, caf??)
docs/matricula-ficha-cuidados-aluno.md:62:## 3. Se????o: Alimenta????o em eventos e aula
docs/modelo-contratos-academicos-e-artistico.md:17:Contrato de Curso Livre (CURSO_LIVRE)
docs/modelo-contratos-academicos-e-artistico.md:20:(espet??culos, festivais, mostras, eventos art??sticos em geral)
docs/modelo-contratos-academicos-e-artistico.md:52:CURSO_LIVRE	Workshops, intensivos, cursos fechados (turmas CURSO_LIVRE).
docs/modelo-contratos-academicos-e-artistico.md:53:PROJETO_ARTISTICO	Espet??culos, festivais, mostras e eventos art??sticos.
docs/modelo-contratos-academicos-e-artistico.md:61:tipo_contrato	enum	REGULAR / CURSO_LIVRE / PROJETO_ARTISTICO
docs/modelo-contratos-academicos-e-artistico.md:110:Para CURSO_LIVRE:
docs/modelo-contratos-academicos-e-artistico.md:122:{{TIPO_PROJETO}} (espet??culo, festival, mostra???)
docs/modelo-contratos-academicos-e-artistico.md:137:{{VALOR_INSCRICAO}}	Taxa de curso livre
docs/modelo-contratos-academicos-e-artistico.md:143:{{NUMERO_PARCELAS}}	Parcelas para cursos livres ou eventos
docs/modelo-contratos-academicos-e-artistico.md:166:presta????o de servi??os educacionais (REGULAR)
docs/modelo-contratos-academicos-e-artistico.md:168:presta????o de servi??o art??stico-cultural (PROJETO_ARTISTICO)
docs/modelo-contratos-academicos-e-artistico.md:170:presta????o de servi??o t??cnico-formativo (CURSO_LIVRE)
docs/modelo-contratos-academicos-e-artistico.md:180:Oferta das aulas
docs/modelo-contratos-academicos-e-artistico.md:220:Identifica qual modelo usar (REGULAR / CURSO_LIVRE / PROJETO_ARTISTICO).
docs/modelo-contratos-academicos-e-artistico.md:327:REGULAR e CURSO_LIVRE puxam dados diretamente da turma.
docs/modelo-contratos-acessorios.md:6:Status: Documento base ??? contratos operacionais, sociais, administrativos e de servi??o
docs/modelo-contratos-acessorios.md:19:Eventos e Projetos Art??sticos
docs/modelo-contratos-acessorios.md:21:Workshops e cursos livres
docs/modelo-contratos-acessorios.md:23:Presta????o de servi??os (professores convidados, t??cnicos, loca????es)
docs/modelo-contratos-acessorios.md:52:C. Presta????o de Servi??os	Professor Convidado ??? Artista Convidado ??? T??cnicos (som/luz/foto) ??? Costureiras/figurino ??? Loca????o de espa??o ??? Loca????o de equipamentos
docs/modelo-contratos-acessorios.md:53:D. Documentos Financeiros	Recibo Simples ??? Recibo de Presta????o de Servi??o ??? Recibo de Cach?? Art??stico ??? Declara????o de Participa????o
docs/modelo-contratos-acessorios.md:55:F. Contratos de Workshops / Curso Livre	Contrato com o convidado que ministra o curso
docs/modelo-contratos-acessorios.md:81:referencia_id	FK flex??vel	Pode apontar para: matr??cula, projeto art??stico, workshop, contas a pagar/receber
docs/modelo-contratos-acessorios.md:170:espet??culos
docs/modelo-contratos-acessorios.md:198:{{SERVICO}}
docs/modelo-contratos-acessorios.md:202:{{DATA_EVENTO}}
docs/modelo-contratos-acessorios.md:212:eventos internos/externos do calend??rio
docs/modelo-contratos-acessorios.md:214:projetos art??sticos (espet??culo, festival)
docs/modelo-contratos-acessorios.md:225:Recibo de Presta????o de Servi??o
docs/modelo-contratos-acessorios.md:261:F. CONTRATOS DE WORKSHOPS / CURSO LIVRE (COM O PROFESSOR)
docs/modelo-contratos-acessorios.md:267:workshop
docs/modelo-contratos-acessorios.md:279:devem ser vinculados ao evento/curso livre
docs/modelo-contratos-acessorios.md:292:evento
docs/modelo-contratos-acessorios.md:294:turma curso livre
docs/modelo-contratos-acessorios.md:325:Contratos de servi??o e patroc??nio geram lan??amentos em centros de custo.
docs/modelo-contratos-acessorios.md:333:8.3 Workshop / Curso Livre
docs/modelo-contratos-acessorios.md:335:Contratos com professores convidados vinculam-se ??s turmas tipo CURSO_LIVRE.
docs/modelo-curriculo.md:19:participantes de projetos e eventos
docs/modelo-curriculo.md:27:Experi??ncias art??sticas ??? hist??rico de espet??culos, coreografias, atua????es e participa????es relevantes.
docs/modelo-curriculo.md:70:cursos conclu??dos (REGULAR ou CURSO_LIVRE)
docs/modelo-curriculo.md:77:A cada turma REGULAR ou CURSO_LIVRE encerrada, o sistema cria/atualiza um registro com:
docs/modelo-curriculo.md:85:tipo_turma	REGULAR ou CURSO_LIVRE
docs/modelo-curriculo.md:98:Tipo (Regular / Curso Livre)
docs/modelo-curriculo.md:124:tipo_formacao	CURSO / WORKSHOP / FESTIVAL / CERTIFICACAO / OUTRO
docs/modelo-curriculo.md:125:instituicao	Escola, evento, festival
docs/modelo-curriculo.md:150:tipo	ESPETACULO / APRESENTACAO / COREOGRAFIA / PROJETO / OUTRO
docs/modelo-curriculo.md:151:nome_evento	Nome do espet??culo/evento
docs/modelo-curriculo.md:154:data_evento	Data
docs/modelo-curriculo.md:198:perfil para espet??culos
docs/modelo-fisico-matriculas.md:37:   - `turmas` (REGULAR / CURSO_LIVRE / ENSAIO);
docs/modelo-fisico-matriculas.md:63:| `tipo_matricula`            | `text` / enum              | ??????         | `REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO`. |
docs/modelo-fisico-matriculas.md:64:| `vinculo_id`                | `bigint`                   | ??????         | FK principal de destino pedag??gico: hoje ??? `turmas(turma_id)` para REGULAR/CURSO_LIVRE; futuro ??? tamb??m projetos. |
docs/modelo-fisico-matriculas.md:82:  - `turmas.turma_id` para `REGULAR` e `CURSO_LIVRE`;
docs/modelo-fisico-matriculas.md:93:- `CURSO_LIVRE`  
docs/modelo-fisico-matriculas.md:135:- Para `CURSO_LIVRE`:  
docs/modelo-fisico-matriculas.md:170:- Para `REGULAR` e `CURSO_LIVRE`:  
docs/modelo-fisico-matriculas.md:174:    - `CURSO_LIVRE` ??? `turmas.tipo_turma = 'CURSO_LIVRE'`  
docs/modelo-fisico-matriculas.md:199:   - Regra: para matr??culas de tipo `REGULAR` e `CURSO_LIVRE`, deve existir exatamente **um** registro de `turma_aluno` com `matricula_id` preenchido e `turma_id = matriculas.vinculo_id`.  
docs/modelo-fisico-matriculas.md:209:- `UNIQUE (matricula_id, turma_id)` para garantir 1:1 (matr??cula ??? turma regular/curso livre).
docs/modelo-fisico-matriculas.md:267:- `contratos_modelo` ??? cat??logos de modelos (REGULAR, CURSO_LIVRE, PROJETO_ARTISTICO, etc.).  
docs/modelo-matriculas.md:21:Matr??cula em Curso Livre (CURSO_LIVRE)
docs/modelo-matriculas.md:23:Workshops, intensivos, cursos de curta dura????o.
docs/modelo-matriculas.md:31:Espet??culos, festivais, mostras, apresenta????es especiais.
docs/modelo-matriculas.md:46:(Turma regular, curso livre ou projeto art??stico)
docs/modelo-matriculas.md:60:CURSO_LIVRE	Matr??cula em workshop, intensivo, curso fechado.
docs/modelo-matriculas.md:61:PROJETO_ARTISTICO	Matr??cula para participa????o em espet??culo/festival/mostra.
docs/modelo-matriculas.md:97:Para CURSO_LIVRE
docs/modelo-matriculas.md:99:Selecionar Turma do tipo CURSO_LIVRE
docs/modelo-matriculas.md:100:(workshop, col??nia, intensivo).
docs/modelo-matriculas.md:105:(espet??culo, festival, mostra, apresenta????o especial).
docs/modelo-matriculas.md:154:CURSO_LIVRE
docs/modelo-matriculas.md:196:CURSO_LIVRE ??? Contrato de participa????o em curso livre
docs/modelo-matriculas.md:218:taxa de matr??cula ou inscri????o
docs/modelo-matriculas.md:233:tipo_matricula	enum	REGULAR, CURSO_LIVRE, PROJETO_ARTISTICO
docs/modelo-matriculas.md:246:Usa vinculo_id para REGULAR e CURSO_LIVRE.
docs/modelo-matriculas.md:263:Conclus??o de turmas REGULARES e CURSO_LIVRE alimenta hist??rico acad??mico.
docs/modelo-matriculas.md:276:CURSO_LIVRE
docs/modelo-turmas.md:15:Curso livre (workshops, cursos de curta dura????o, col??nias de f??rias)
docs/modelo-turmas.md:17:Turma de ensaio (ensaios para espet??culos, coreografias, apresenta????es)
docs/modelo-turmas.md:28:???? CURSO_LIVRE
docs/modelo-turmas.md:29:Cursos intensivos, workshops, col??nias de f??rias, cursos fechados de 1 dia ou mais.
docs/modelo-turmas.md:32:Ensaios ligados a espet??culo/coreografia.
docs/modelo-turmas.md:38:tipo_turma	enum	REGULAR, CURSO_LIVRE, ENSAIO
docs/modelo-turmas.md:85:4.2. Turma de Curso Livre (CURSO_LIVRE)
docs/modelo-turmas.md:89:Workshops
docs/modelo-turmas.md:100:evento_id	FK	Evento/festival, se fizer parte
docs/modelo-turmas.md:119:Ensaios para espet??culo (interno/externo)
docs/modelo-turmas.md:127:eventos_artistico
docs/modelo-turmas.md:134:evento_id	FK
docs/modelo-turmas.md:142:Pode ser ligada a espet??culo (ex.: Fijan 2026)
docs/modelo-turmas.md:169:CURSO_LIVRE
docs/modelo-turmas.md:217:CURSO_LIVRE ??? curso fechado
docs/modelo-turmas.md:225:ensaios e eventos
docs/modelo-turmas.md:257:Ao encerrar turma REGULAR ou CURSO_LIVRE:
docs/padrao-icones.md:202:Calend??rio geral, eventos internos, externos e feriados ??? CalendarBlank
docs/plano-migracao-matriculas.md:92:   - `tipo_matricula` (`REGULAR`, `CURSO_LIVRE`, `PROJETO_ARTISTICO`).  
docs/plano-migracao-matriculas.md:126:   - Criar `UNIQUE (matricula_id, turma_id)` para garantir 1 v??nculo por turma por matr??cula regular/curso livre (conferir depois das primeiras matr??culas reais).
docs/plano-migracao-matriculas.md:190:   - `tipo_matricula` = inferido pela turma (`REGULAR` ou `CURSO_LIVRE`).  
planning/migracoes/matriculas/etapa-1-criar-matriculas-e-ajustar-turma_aluno.md:46:CREATE TYPE tipo_matricula_enum AS ENUM ('REGULAR', 'CURSO_LIVRE', 'PROJETO_ARTISTICO');

## SRC (sem node_modules/.next)

src/app/(private)/academico/turmas/[turmaId]/_components/EditarTurmaDialog.tsx:118:                <option value="CURSO_LIVRE">CURSO_LIVRE</option>
src/app/(private)/academico/turmas/nova/page.tsx:12:const TIPOS_TURMA: TipoTurma[] = ["REGULAR", "CURSO_LIVRE", "ENSAIO"];
src/app/(private)/admin/financeiro/plano-contas/page.tsx:22:  { id: 4, codigo: "1.1.2", nome: "Workshops", tipo: "RECEITA", parentId: 2 },
src/app/(private)/admin/financeiro/plano-contas/page.tsx:23:  { id: 5, codigo: "1.1.3", nome: "Espet├ículos", tipo: "RECEITA", parentId: 2 },
src/app/(private)/admin/relatorios/auditoria/page.tsx:127:          <div style={{ fontWeight: 700 }}>Eventos</div>
src/app/(private)/calendario/eventos-externos/page.tsx:4:  return <PlaceholderPage title="­ƒôà Eventos externos" />;
src/app/(private)/calendario/eventos-internos/page.tsx:4:  return <PlaceholderPage title="­ƒôà Eventos internos" />;
src/app/(private)/config/colaboradores/tipos-vinculo/page.tsx:36:    descricao: "Servi├ºo pontual",
src/app/(private)/escola/academico/turmas/nova/page.tsx:8:const tiposTurma: TipoTurma[] = ["REGULAR", "CURSO_LIVRE", "ENSAIO"];
src/app/(private)/escola/matriculas/nova/page.tsx:13:type ServicoTipo = "TURMA" | "CURSO_LIVRE" | "WORKSHOP" | "ESPETACULO" | "EVENTO";
src/app/(private)/escola/matriculas/nova/page.tsx:15:type ServicoRow = {
src/app/(private)/escola/matriculas/nova/page.tsx:17:  tipo: ServicoTipo;
src/app/(private)/escola/matriculas/nova/page.tsx:66:  // Servi├ºo
src/app/(private)/escola/matriculas/nova/page.tsx:67:  const [servicos, setServicos] = useState<ServicoRow[]>([]);
src/app/(private)/escola/matriculas/nova/page.tsx:68:  const [servicoId, setServicoId] = useState<number | null>(null);
src/app/(private)/escola/matriculas/nova/page.tsx:69:  const servicoSelecionado = useMemo(
src/app/(private)/escola/matriculas/nova/page.tsx:70:    () => servicos.find((s) => s.id === servicoId) ?? null,
src/app/(private)/escola/matriculas/nova/page.tsx:71:    [servicos, servicoId],
src/app/(private)/escola/matriculas/nova/page.tsx:74:  // Turma (apenas se servi├ºo = TURMA)
src/app/(private)/escola/matriculas/nova/page.tsx:90:  async function carregarServicos() {
src/app/(private)/escola/matriculas/nova/page.tsx:94:      const data = await fetchJSON<{ ok: boolean; servicos: ServicoRow[] }>("/api/admin/servicos");
src/app/(private)/escola/matriculas/nova/page.tsx:95:      setServicos((data.servicos ?? []).filter((s) => s.ativo));
src/app/(private)/escola/matriculas/nova/page.tsx:97:      setErro(e instanceof Error ? e.message : "Falha ao carregar servi├ºos");
src/app/(private)/escola/matriculas/nova/page.tsx:113:  async function carregarTurmasPorServico(se: ServicoRow) {
src/app/(private)/escola/matriculas/nova/page.tsx:114:    // Para o v1, se servi├ºo TURMA tiver origem_id, usamos.
src/app/(private)/escola/matriculas/nova/page.tsx:134:    if (!servicoId) {
src/app/(private)/escola/matriculas/nova/page.tsx:135:      setErro("Selecione um servi├ºo.");
src/app/(private)/escola/matriculas/nova/page.tsx:147:    const se = servicoSelecionado;
src/app/(private)/escola/matriculas/nova/page.tsx:149:      setErro("Servi├ºo inv├ílido.");
src/app/(private)/escola/matriculas/nova/page.tsx:157:      setErro("Servi├ºo do tipo TURMA exige turma_id.");
src/app/(private)/escola/matriculas/nova/page.tsx:169:        servico_id: servicoId,
src/app/(private)/escola/matriculas/nova/page.tsx:210:            <label className="text-sm font-medium">Servi├ºo</label>
src/app/(private)/escola/matriculas/nova/page.tsx:214:                value={servicoId ?? ""}
src/app/(private)/escola/matriculas/nova/page.tsx:217:                  setServicoId(v);
src/app/(private)/escola/matriculas/nova/page.tsx:218:                  const se = servicos.find((s) => s.id === v) ?? null;
src/app/(private)/escola/matriculas/nova/page.tsx:219:                  if (se) void carregarTurmasPorServico(se);
src/app/(private)/escola/matriculas/nova/page.tsx:223:                {servicos.map((s) => (
src/app/(private)/escola/matriculas/nova/page.tsx:233:                onClick={() => void carregarServicos()}
src/app/(private)/escola/matriculas/nova/page.tsx:240:            {servicoSelecionado?.tipo === "TURMA" && servicoSelecionado?.origem_id ? (
src/app/(private)/escola/matriculas/nova/page.tsx:242:                Servi├ºo TURMA vinculado automaticamente ├á turma_id = {servicoSelecionado.origem_id}.
src/app/(private)/escola/matriculas/nova/page.tsx:301:        {servicoSelecionado?.tipo === "TURMA" && !servicoSelecionado?.origem_id ? (
src/app/(private)/escola/matriculas/nova/page.tsx:312:              (v1) Se o servi├ºo TURMA n├úo tem origem_id, informe manualmente o turma_id.
src/app/(private)/matriculas/novo/page.tsx:5:type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
src/app/(private)/matriculas/novo/page.tsx:437:                  label="Curso livre"
src/app/(private)/matriculas/novo/page.tsx:438:                  description="Aulas avulsas, oficinas, cursos de ferias."
src/app/(private)/matriculas/novo/page.tsx:439:                  selected={tipoMatricula === "CURSO_LIVRE"}
src/app/(private)/matriculas/novo/page.tsx:440:                  onClick={() => handleSelectTipo("CURSO_LIVRE")}
src/app/(private)/matriculas/novo/page.tsx:444:                  description="Projetos, espetaculos, montagens especiais."
src/app/(private)/pessoas/[id]/curriculo/page.tsx:172:            {item.nome_evento || "Experi├¬ncia art├¡stica"}
src/app/(private)/pessoas/[id]/curriculo/page.tsx:178:            Data: {item.data_evento || "ÔÇö"}
src/app/api/admin/matriculas/precos-servico/route.ts:13:type PrecoServicoPayload = {
src/app/api/admin/matriculas/precos-servico/route.ts:14:  servico_id: number;
src/app/api/admin/matriculas/precos-servico/route.ts:25:      `SELECT * FROM public.matricula_precos_servico ORDER BY ativo DESC, ano_referencia DESC, id DESC`,
src/app/api/admin/matriculas/precos-servico/route.ts:37:  const body = (await req.json().catch(() => null)) as PrecoServicoPayload | null;
src/app/api/admin/matriculas/precos-servico/route.ts:38:  if (!body?.servico_id || !body?.ano_referencia || !body?.plano_id) {
src/app/api/admin/matriculas/precos-servico/route.ts:39:    return NextResponse.json({ ok: false, error: "servico_id_ano_plano_obrigatorios" }, { status: 400 });
src/app/api/admin/matriculas/precos-servico/route.ts:48:      INSERT INTO public.matricula_precos_servico (
src/app/api/admin/matriculas/precos-servico/route.ts:49:        servico_id, ano_referencia, plano_id, centro_custo_id, ativo, created_at, updated_at
src/app/api/admin/matriculas/precos-servico/route.ts:51:      ON CONFLICT (servico_id, ano_referencia)
src/app/api/admin/matriculas/precos-servico/route.ts:59:      [body.servico_id, body.ano_referencia, body.plano_id, body.centro_custo_id ?? null, ativo],
src/app/api/admin/servicos/[id]/route.ts:25:    const { rows } = await client.query(`SELECT * FROM public.servicos WHERE id = $1`, [id]);
src/app/api/admin/servicos/[id]/route.ts:27:    return NextResponse.json({ ok: true, servico: rows[0] }, { status: 200 });
src/app/api/admin/servicos/[id]/route.ts:47:      UPDATE public.servicos
src/app/api/admin/servicos/[id]/route.ts:65:    return NextResponse.json({ ok: true, servico: rows[0] }, { status: 200 });
src/app/api/admin/servicos/route.ts:13:type ServicoTipo = "TURMA" | "CURSO_LIVRE" | "WORKSHOP" | "ESPETACULO" | "EVENTO";
src/app/api/admin/servicos/route.ts:15:type ServicoPayload = {
src/app/api/admin/servicos/route.ts:16:  tipo: ServicoTipo;
src/app/api/admin/servicos/route.ts:28:    const { rows } = await client.query(`SELECT * FROM public.servicos ORDER BY ativo DESC, id DESC`);
src/app/api/admin/servicos/route.ts:29:    return NextResponse.json({ ok: true, servicos: rows }, { status: 200 });
src/app/api/admin/servicos/route.ts:39:  const body = (await req.json().catch(() => null)) as ServicoPayload | null;
src/app/api/admin/servicos/route.ts:50:      INSERT INTO public.servicos (
src/app/api/admin/servicos/route.ts:68:    return NextResponse.json({ ok: true, servico: rows[0] }, { status: 201 });
src/app/api/curriculo/[pessoaId]/pdf/route.ts:196:        e.nome_evento ?? "",
src/app/api/curriculo/[pessoaId]/pdf/route.ts:199:        e.data_evento ?? "",
src/app/api/matriculas/novo/route.ts:21:type TipoMatricula = "REGULAR" | "CURSO_LIVRE" | "PROJETO_ARTISTICO";
src/app/api/matriculas/novo/route.ts:25:  "CURSO_LIVRE",
src/app/api/matriculas/operacional/criar/route.ts:12:  servico_id?: number;
src/app/api/matriculas/operacional/criar/route.ts:29:type ServicoTipo = "TURMA" | "CURSO_LIVRE" | "WORKSHOP" | "ESPETACULO" | "EVENTO";
src/app/api/matriculas/operacional/criar/route.ts:31:type ServicoAtivo = {
src/app/api/matriculas/operacional/criar/route.ts:33:  tipo: ServicoTipo;
src/app/api/matriculas/operacional/criar/route.ts:46:type PrecoServicoAtivo = {
src/app/api/matriculas/operacional/criar/route.ts:48:  servico_id: number;
src/app/api/matriculas/operacional/criar/route.ts:203:async function getServicoAtivo(client: DbClient, servicoId: number): Promise<ServicoAtivo | null> {
src/app/api/matriculas/operacional/criar/route.ts:211:    FROM public.servicos
src/app/api/matriculas/operacional/criar/route.ts:216:    [servicoId],
src/app/api/matriculas/operacional/criar/route.ts:224:    tipo: String(r.tipo) as ServicoTipo,
src/app/api/matriculas/operacional/criar/route.ts:266:async function getPrecoServicoAtivo(
src/app/api/matriculas/operacional/criar/route.ts:268:  servicoId: number,
src/app/api/matriculas/operacional/criar/route.ts:270:): Promise<PrecoServicoAtivo | null> {
src/app/api/matriculas/operacional/criar/route.ts:275:      servico_id,
src/app/api/matriculas/operacional/criar/route.ts:279:    FROM public.matricula_precos_servico
src/app/api/matriculas/operacional/criar/route.ts:281:      AND servico_id = $1
src/app/api/matriculas/operacional/criar/route.ts:286:    [servicoId, anoRef],
src/app/api/matriculas/operacional/criar/route.ts:294:    servico_id: Number(r.servico_id),
src/app/api/matriculas/operacional/criar/route.ts:469:    const servicoId = parsePositiveInt(body.servico_id);
src/app/api/matriculas/operacional/criar/route.ts:472:    if (!pessoaId || !respFinId || !anoRef || (!turmaIdInput && !servicoId)) {
src/app/api/matriculas/operacional/criar/route.ts:477:            "pessoa_id, responsavel_financeiro_id, ano_referencia e (turma_id ou servico_id) sao obrigatorios e devem ser inteiros > 0.",
src/app/api/matriculas/operacional/criar/route.ts:482:    if (turmaIdInput && servicoId) {
src/app/api/matriculas/operacional/criar/route.ts:484:        { error: "payload_invalido", message: "Informe apenas um entre turma_id e servico_id." },
src/app/api/matriculas/operacional/criar/route.ts:514:      let servico: ServicoAtivo | null = null;
src/app/api/matriculas/operacional/criar/route.ts:517:      if (servicoId) {
src/app/api/matriculas/operacional/criar/route.ts:518:        servico = await getServicoAtivo(client, servicoId);
src/app/api/matriculas/operacional/criar/route.ts:519:        if (!servico) {
src/app/api/matriculas/operacional/criar/route.ts:521:          return NextResponse.json({ error: "servico_inexistente", message: "Servico nao encontrado ou inativo." }, { status: 404 });
src/app/api/matriculas/operacional/criar/route.ts:524:        if (servico.tipo === "TURMA") {
src/app/api/matriculas/operacional/criar/route.ts:526:            servico.origem_id !== null && servico.origem_id !== undefined ? Number(servico.origem_id) : null;
src/app/api/matriculas/operacional/criar/route.ts:530:              { error: "servico_origem_invalida", message: "Servico TURMA sem origem valida." },
src/app/api/matriculas/operacional/criar/route.ts:540:      const preco = servicoId
src/app/api/matriculas/operacional/criar/route.ts:541:        ? await getPrecoServicoAtivo(client, servicoId, anoRef)
src/app/api/matriculas/operacional/criar/route.ts:550:            message: servicoId
src/app/api/matriculas/operacional/criar/route.ts:551:              ? "Nao existe preco ativo para o servico/ano informado."
src/app/api/matriculas/operacional/criar/route.ts:630:          servico_id
src/app/api/matriculas/operacional/criar/route.ts:632:        RETURNING id, pessoa_id, responsavel_financeiro_id, vinculo_id, plano_matricula_id, ano_referencia, data_matricula, status, metodo_liquidacao, servico_id
src/app/api/matriculas/operacional/criar/route.ts:634:        [pessoaId, respFinId, "REGULAR", turmaId, plano.id, anoRef, dataMatriculaEfetiva, metodoLiquidacao, servicoId ?? null],
src/app/api/matriculas/operacional/criar/route.ts:690:      const referenciaLabel = turmaId ? `Turma ${turmaId}` : servico ? `Servico ${servico.id}` : "Servico";
src/app/api/matriculas/operacional/criar/route.ts:859:            servico_id:
src/app/api/matriculas/operacional/criar/route.ts:860:              matricula?.servico_id === null || matricula?.servico_id === undefined
src/app/api/matriculas/operacional/criar/route.ts:862:                : Number(matricula?.servico_id),
src/app/api/pessoas/[id]/route.ts:30:  inscricao_estadual,
src/app/api/pessoas/route.ts:48:        inscricao_estadual,
src/config/sidebar/escola.ts:19:      { label: "­ƒÜº ­ƒôà Eventos internos", href: "/calendario/eventos-internos" },
src/config/sidebar/escola.ts:20:      { label: "­ƒÜº ­ƒôà Eventos externos", href: "/calendario/eventos-externos" },
src/lib/academico/curriculoServer.ts:91:    .order("data_evento", { ascending: false });
src/lib/financeiro/helpDashboardInteligente.ts:22:- Qualidade de receita por produto/servi├ºo (mix e depend├¬ncia de SKU).
src/types/curriculo.ts:51:  nome_evento: string | null;
src/types/curriculo.ts:54:  data_evento: string | null;
src/types/pessoas.ts:53:  inscricao_estadual: string | null;
src/types/turmas.ts:3:export type TipoTurma = "REGULAR" | "CURSO_LIVRE" | "ENSAIO";

## Arquivos mais prováveis (índice manual)
- ADR-0008-matriculas-referenciam-servico.md
- api-matriculas.md / modelo-matriculas.md / plano-migracao-matriculas.md
- (src) turmas.ts (menciona CURSO_LIVRE)
- (src) paginas/rotas já criadas de escola/matriculas
