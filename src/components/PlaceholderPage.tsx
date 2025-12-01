import { type ReactNode } from "react";

type PlaceholderPageProps = {
  title: string;
  children?: ReactNode;
};

export default function PlaceholderPage({
  title,
  children,
}: PlaceholderPageProps) {
  return (
    <div className="space-y-3">
      <h1 className="h1">{title}</h1>
      <div className="card">
        <p className="text-sm text-[var(--muted)]">
          Funcionalidade em construção — disponível em breve.
        </p>
        {children}
      </div>
    </div>
  );
}
