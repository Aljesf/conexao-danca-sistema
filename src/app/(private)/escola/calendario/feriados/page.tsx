export default function FeriadosPage() {
  return (
    <div className="rounded-lg border p-4 space-y-2">
      <h2 className="text-lg font-medium">Feriados e itens institucionais</h2>
      <p className="text-sm text-muted-foreground">
        MVP em andamento. Esta aba sera conectada ao cadastro de <code>calendario_itens_institucionais</code>.
      </p>
      <p className="text-sm text-muted-foreground">
        Por enquanto, alimente via Supabase (SQL Editor) e valide na Visao geral.
      </p>
    </div>
  );
}
