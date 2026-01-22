export type PublicFormTemplateDto = {
  id: string;
  titulo?: string | null;
  descricao?: string | null;
  header_image_url?: string | null;
  footer_image_url?: string | null;
  intro_markdown?: string | null;
  outro_markdown?: string | null;
  questions: Array<{
    id: string;
    codigo: string;
    titulo: string;
    descricao?: string | null;
    tipo: string;
    obrigatoria?: boolean;
    options?: Array<{ value: string; label: string }>;
    scale_min?: number | null;
    scale_max?: number | null;
  }>;
};

export function mapTemplateToWizardProps(t: PublicFormTemplateDto) {
  const mapType = (tipo: string) => {
    switch (tipo) {
      case "short_text":
      case "text":
        return "short_text";
      case "textarea":
      case "long_text":
        return "long_text";
      case "number":
        return "number";
      case "date":
        return "date";
      case "single_choice":
        return "single_choice";
      case "multi_choice":
        return "multi_choice";
      case "scale":
        return "scale";
      case "boolean":
        return "boolean";
      default:
        return "short_text";
    }
  };

  const questions = (t.questions ?? []).map((q) => ({
    id: q.id,
    code: q.codigo,
    title: q.titulo,
    description: q.descricao ?? null,
    type: mapType(q.tipo),
    required: Boolean(q.obrigatoria),
    options: q.options ?? [],
    scaleMin: q.scale_min ?? null,
    scaleMax: q.scale_max ?? null,
  }));

  return {
    headerMediaUrl: t.header_image_url ?? null,
    footerMediaUrl: t.footer_image_url ?? null,
    cover: { title: t.titulo ?? null, subtitle: t.descricao ?? null },
    intro: { markdown: t.intro_markdown ?? null },
    outro: { markdown: t.outro_markdown ?? null },
    questions,
  };
}
