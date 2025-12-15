export default function ConstrutorRelatoriosPlaceholder() {
  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Construtor de Relatórios</h1>
      <p style={{ color: "rgba(0,0,0,0.65)", marginTop: 8 }}>
        Este módulo será o centro oficial de relatórios do sistema. Ele é separado do dashboard: relatório não é “gráfico bonito”, é uma
        estrutura reutilizável de dados com propósito claro.
      </p>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid #e6e6e6", background: "rgba(0,0,0,0.02)" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Princípios do Construtor (oficial)</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(0,0,0,0.75)", lineHeight: 1.6 }}>
          <li>
            <b>Controle humano sempre:</b> é possível criar e editar relatórios sem IA.
          </li>
          <li>
            <b>IA é opcional e acionável:</b> o GPT nunca roda automaticamente; sempre depende de comando/botão.
          </li>
          <li>
            <b>Relatório é modelo, não resultado:</b> o que se salva é a estrutura; os dados são gerados sob demanda.
          </li>
          <li>
            <b>Somente cruzamentos válidos:</b> o sistema só permite relacionamentos existentes no schema real.
          </li>
          <li>
            <b>Auditável e previsível:</b> mesmos filtros → mesmos dados.
          </li>
        </ul>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>O que este módulo vai permitir</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(0,0,0,0.75)", lineHeight: 1.6 }}>
          <li>Escolher uma classe base (Pessoas, Alunos, Turmas, Matrículas, Financeiro, Loja etc.).</li>
          <li>Selecionar campos e classes relacionadas (somente vínculos válidos).</li>
          <li>Criar filtros, agrupamentos e ordenações.</li>
          <li>Gerar saída em Tela, PDF e Excel.</li>
        </ul>
      </div>

      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, border: "1px solid #f0d9a6", background: "rgba(255, 205, 80, 0.12)" }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Status</div>
        <div style={{ color: "rgba(0,0,0,0.75)" }}>
          Em construção. Esta página é um placeholder para orientar a evolução do módulo sem poluir o menu com relatórios avulsos.
        </div>
        <div style={{ marginTop: 10, fontWeight: 700 }}>Roadmap (resumo)</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "rgba(0,0,0,0.75)", lineHeight: 1.6 }}>
          <li>UI do Query Builder (classe base → campos → filtros → saída).</li>
          <li>Salvar modelos de relatório (nome, estrutura, filtros padrão, permissões).</li>
          <li>Modo assistido por GPT (opcional) para sugerir modelos a partir de linguagem natural.</li>
        </ul>
      </div>
    </div>
  );
}
