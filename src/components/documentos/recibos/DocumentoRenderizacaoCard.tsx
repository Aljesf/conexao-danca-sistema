"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  headerSource: string;
  footerSource: string;
  bodySource: string;
  pageMargin: string;
  headerHeight: string;
  footerHeight: string;
  usaFallbackLegado: string;
};

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

export function DocumentoRenderizacaoCard({
  headerSource,
  footerSource,
  bodySource,
  pageMargin,
  headerHeight,
  footerHeight,
  usaFallbackLegado,
}: Props) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-900">Renderizacao</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <Item label="Fonte do cabecalho" value={headerSource} />
        <Item label="Fonte do rodape" value={footerSource} />
        <Item label="Fonte do corpo" value={bodySource} />
        <Item label="Fallback legado" value={usaFallbackLegado} />
        <Item label="Margem" value={pageMargin} />
        <Item label="Altura do cabecalho" value={headerHeight} />
        <Item label="Altura do rodape" value={footerHeight} />
      </CardContent>
    </Card>
  );
}

export default DocumentoRenderizacaoCard;
